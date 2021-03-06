import omit from 'lodash/omit'
import groupBy from 'lodash/groupBy'
import orderBy from 'lodash/orderBy'
import {
    StorageModule,
    StorageModuleConfig,
    StorageModuleConstructorArgs,
} from '@worldbrain/storex-pattern-modules'
import { STORAGE_VERSIONS } from '../../web-interface/storage/versions'
import { UserReference } from '../../web-interface/types/users'
import {
    SharedAnnotationReference,
    SharedListReference,
} from '../../content-sharing/types'
import {
    ConversationReply,
    ConversationThread,
} from '../../web-interface/types/storex-generated/content-conversations'
import ContentSharingStorage from '../../content-sharing/storage'
import {
    PreparedAnnotationReply as PreparedReply,
    CreateConversationReplyParams,
    PreparedAnnotationReplies,
    PreparedThread,
} from './types'
import {
    ConversationReplyReference,
    ConversationThreadReference,
} from '../types'
import { augmentObjectWithReferences } from '../../storage/references'
import { fetchInChunks } from '../../storage/utils'

type RawReply = ConversationReply & {
    id: number | string
    previousReply?: number | string
    sharedPageInfo: number | string
    sharedAnnotation: number | string
    user: number | string
}

type RawThread = ConversationThread & {
    id: number | string
    sharedAnnotation: number | string
    pageCreator: number | string
}

export default class ContentConversationStorage extends StorageModule {
    constructor(
        private options: StorageModuleConstructorArgs & {
            autoPkType: 'number' | 'string'
            contentSharing: ContentSharingStorage
        },
    ) {
        super(options)
    }

    getConfig = (): StorageModuleConfig => ({
        collections: {
            conversationThread: {
                version: STORAGE_VERSIONS[6].date,
                fields: {
                    updatedWhen: { type: 'timestamp' },
                    normalizedPageUrl: { type: 'string' },
                },
                relationships: [
                    { childOf: 'user', alias: 'pageCreator' },
                    { childOf: 'sharedAnnotation' },
                    { childOf: 'sharedList' },
                ],
            },
            conversationReply: {
                version: STORAGE_VERSIONS[6].date,
                fields: {
                    createdWhen: { type: 'timestamp' },
                    normalizedPageUrl: { type: 'string' },
                    content: { type: 'string' },
                },
                relationships: [
                    { childOf: 'user' },
                    { childOf: 'conversationReply', alias: 'previousReply' },
                    { childOf: 'user', alias: 'pageCreator' },
                    { childOf: 'conversationThread' },
                    { childOf: 'sharedAnnotation' },
                    { childOf: 'sharedList' },
                ],
                groupBy: [
                    { subcollectionName: 'replies', key: 'sharedAnnotation' },
                ],
            },
        },
        operations: {
            createThread: {
                collection: 'conversationThread',
                operation: 'createObject',
            },
            createReply: {
                collection: 'conversationReply',
                operation: 'createObject',
            },
            findRepliesByCreatorAndPageUrl: {
                operation: 'findObjects',
                collection: 'conversationReply',
                args: {
                    pageCreator: '$pageCreator:pk',
                    normalizedPageUrl: '$normalizedPageUrl:string',
                },
            },
            findRepliesByAnnotation: {
                operation: 'findObjects',
                collection: 'conversationReply',
                args: {
                    sharedAnnotation: '$sharedAnnotation:pk',
                },
            },
            findRepliesByAnnotations: {
                operation: 'findObjects',
                collection: 'conversationReply',
                args: {
                    sharedAnnotation: { $in: '$sharedAnnotations:pk' },
                },
            },
            findReplyById: {
                operation: 'findObject',
                collection: 'conversationReply',
                args: {
                    id: '$id:pk',
                    sharedAnnotation: '$sharedAnnotation:pk',
                },
            },
            findThreadsByPages: {
                // TODO: Remove
                operation: 'findObjects',
                collection: 'conversationThread',
                args: {
                    normalizedPageUrl: {
                        $in: '$normalizedPageUrls:array:string',
                    },
                },
            },
            findThreadByAnnotation: {
                operation: 'findObject',
                collection: 'conversationThread',
                args: {
                    sharedAnnotation: '$sharedAnnotation:pk',
                },
            },
            findThreadsByAnnotations: {
                operation: 'findObjects',
                collection: 'conversationThread',
                args: {
                    sharedAnnotation: { $in: '$sharedAnnotations:array:pk' },
                },
            },
        },
        accessRules: {
            ownership: {
                conversationReply: {
                    field: 'user',
                    access: ['create'],
                },
            },
            permissions: {
                conversationThread: {
                    read: { rule: true },
                    create: { rule: true },
                },
                conversationReply: { read: { rule: true } },
            },
        },
    })

    async getOrCreateThread(params: {
        pageCreatorReference: UserReference
        annotationReference: SharedAnnotationReference
        normalizedPageUrl: string
        sharedListReference: SharedListReference | null
    }) {
        let thread = await this.operation('findThreadByAnnotation', {
            sharedAnnotation: params.annotationReference.id,
        })
        if (!thread) {
            thread = (
                await this.operation('createThread', {
                    sharedAnnotation: this.options.contentSharing._idFromReference(
                        params.annotationReference,
                    ),
                    sharedList: params.sharedListReference?.id ?? null,
                    updatedWhen: Date.now(),
                    pageCreator: params.pageCreatorReference.id,
                    normalizedPageUrl: params.normalizedPageUrl,
                })
            ).object
        }

        return augmentObjectWithReferences<
            ConversationThread,
            ConversationThreadReference,
            {}
        >(thread, 'conversation-thread-reference', {})
    }

    async createReply(
        params: CreateConversationReplyParams,
    ): Promise<{
        reference: ConversationReplyReference
        threadReference: ConversationThreadReference
    }> {
        // NOTE: We don't create thread and reply in parellel so the storage hook has access to both
        // the reply and the thread when the reply is created

        const thread = await this.getOrCreateThread({
            ...params,
            sharedListReference: null,
        })
        const { object } = await this.operation('createReply', {
            user: params.userReference.id,
            conversationThread: thread.reference.id,
            previousReply: params.previousReplyReference
                ? params.previousReplyReference.id
                : null,
            sharedAnnotation: this.options.contentSharing._idFromReference(
                params.annotationReference,
            ),
            sharedList: null,
            createdWhen: Date.now(),
            pageCreator: params.pageCreatorReference.id,
            normalizedPageUrl: params.normalizedPageUrl,
            ...params.reply,
        })

        return {
            reference: {
                type: 'conversation-reply-reference',
                id: object.id,
            },
            threadReference: thread.reference,
        }
    }

    async getRepliesByCreatorPage(params: {
        pageCreatorReference: UserReference
        normalizedPageUrl: string
    }) {
        const rawReplies: Array<RawReply> = await this.operation(
            'findRepliesByCreatorAndPageUrl',
            {
                pageCreator: this.options.contentSharing._idFromReference(
                    params.pageCreatorReference,
                ),
                normalizedPageUrl: params.normalizedPageUrl,
            },
        )

        const grouped: {
            [annotationId: string]: Array<PreparedReply>
        } = groupBy(
            this._prepareReplies(rawReplies),
            (reply) => reply.sharedAnnotation.id,
        )

        return grouped
    }

    async getRepliesByAnnotation(params: {
        annotationReference: SharedAnnotationReference
    }): Promise<PreparedReply[]> {
        const rawReplies: Array<RawReply> = await this.operation(
            'findRepliesByAnnotation',
            {
                sharedAnnotation: this.options.contentSharing._idFromReference(
                    params.annotationReference,
                ),
            },
        )
        return this._prepareReplies(rawReplies)
    }

    async getRepliesByAnnotations({
        annotationReferences,
        sortingFn = (a, b) => a.reply.createdWhen - b.reply.createdWhen,
    }: {
        annotationReferences: SharedAnnotationReference[]
        sortingFn?: (a: PreparedReply, b: PreparedReply) => number
    }): Promise<PreparedAnnotationReplies> {
        const rawReplies: Array<Array<RawReply>> = await Promise.all(
            annotationReferences.map((annotationReference) =>
                this.operation('findRepliesByAnnotation', {
                    sharedAnnotation: this.options.contentSharing._idFromReference(
                        annotationReference,
                    ),
                }),
            ),
        )

        const preparedReplies: PreparedAnnotationReplies = {}

        for (const annotationReplies of rawReplies) {
            for (const rawReply of annotationReplies) {
                preparedReplies[rawReply.sharedAnnotation] = [
                    ...(preparedReplies[rawReply.sharedAnnotation] ?? []),
                    this._prepareReply(rawReply),
                ]
            }
        }

        for (const id in preparedReplies) {
            preparedReplies[id] = preparedReplies[id].sort(sortingFn)
        }

        return preparedReplies
    }

    async getReply(params: {
        annotationReference: SharedAnnotationReference
        replyReference: ConversationReplyReference
    }) {
        const rawReply: RawReply | null = await this.operation(
            'findReplyById',
            {
                id: params.replyReference.id,
                sharedAnnotation: params.annotationReference.id,
            },
        )
        return rawReply && this._prepareReply(rawReply)
    }

    _prepareReplies(rawReplies: Array<RawReply>) {
        return orderBy(
            rawReplies.map((rawReply) => this._prepareReply(rawReply)),
            (preparedReply) => preparedReply.reply.createdWhen,
            'asc',
        )
    }

    _prepareReply(rawReply: RawReply): PreparedReply {
        return {
            reference: {
                type: 'conversation-reply-reference',
                id: rawReply.id,
            },
            previousReply: rawReply.previousReply
                ? {
                      type: 'conversation-reply-reference',
                      id: rawReply.previousReply,
                  }
                : null,
            reply: omit(rawReply, 'sharedPageInfo', 'sharedAnnotation', 'user'),
            sharedAnnotation: {
                type: 'shared-annotation-reference',
                id: rawReply.sharedAnnotation,
            },
            userReference: { type: 'user-reference', id: rawReply.user },
        }
    }

    async getThreadsForPages(params: {
        normalizedPageUrls: string[]
    }): Promise<Array<PreparedThread>> {
        const rawThreads: RawThread[] = await fetchInChunks(
            params.normalizedPageUrls,
            (urls) =>
                this.operation('findThreadsByPages', {
                    normalizedPageUrls: urls,
                }),
        )
        return rawThreads.map((rawThread) => this._prepareThread(rawThread))
    }

    async getThreadsForAnnotations(params: {
        annotationReferences: SharedAnnotationReference[]
    }): Promise<Array<PreparedThread>> {
        const rawThreads: RawThread[] = await fetchInChunks(
            params.annotationReferences.map((reference) => reference.id),
            (ids) =>
                this.operation('findThreadsByAnnotations', {
                    sharedAnnotations: ids,
                }),
        )
        return rawThreads.map((rawThread) => this._prepareThread(rawThread))
    }

    _prepareThread(rawThread: RawThread): PreparedThread {
        return {
            thread: omit(rawThread, 'id', 'sharedAnnotation', 'pageCreator'),
            sharedAnnotation: {
                type: 'shared-annotation-reference',
                id: rawThread.sharedAnnotation,
            },
        }
    }
}
