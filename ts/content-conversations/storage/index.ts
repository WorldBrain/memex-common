import omit from 'lodash/omit'
import groupBy from 'lodash/groupBy'
import { OperationBatch } from '@worldbrain/storex'
import { StorageModule, StorageModuleConfig, StorageModuleConstructorArgs } from '@worldbrain/storex-pattern-modules'
import { STORAGE_VERSIONS } from '../../web-interface/storage/versions'
import { UserReference } from '../../web-interface/types/users'
import { SharedAnnotationReference, SharedPageInfoReference } from '../../content-sharing/types'
import { ConversationReply } from '../../web-interface/types/storex-generated/content-conversations'
import ContentSharingStorage from '../../content-sharing/storage'
import { ConversationReplyReference } from '../types'
import { CreateConversationReplyParams } from './types'

interface PreparedReply {
    reference: ConversationReplyReference
    reply: ConversationReply
    sharedAnnotation: SharedAnnotationReference
    userReference: UserReference
}

type RawReply = ConversationReply & {
    id: number | string
    sharedPageInfo: number | string
    sharedAnnotation: number | string
    user: number | string
}

export default class ContentConversationStorage extends StorageModule {
    constructor(private options: StorageModuleConstructorArgs & {
        autoPkType: 'number' | 'string'
        contentSharing: ContentSharingStorage
    }) {
        super(options)
    }

    getConfig = (): StorageModuleConfig => ({
        collections: {
            conversationThread: {
                version: STORAGE_VERSIONS[3].date,
                fields: {
                    updatedWhen: { type: 'timestamp' },
                    normalizedPageUrl: { type: 'string' },
                },
                relationships: [
                    { childOf: 'user', alias: 'pageCreator' },
                    { childOf: 'sharedAnnotation' },
                ],
            },
            conversationReply: {
                version: STORAGE_VERSIONS[3].date,
                fields: {
                    createdWhen: { type: 'timestamp' },
                    normalizedPageUrl: { type: 'string' },
                    content: { type: 'string' }
                },
                relationships: [
                    { childOf: 'user' },
                    { childOf: 'user', alias: 'pageCreator' },
                    { childOf: 'sharedAnnotation' },
                ],
                groupBy: [
                    { subcollectionName: 'replies', key: 'sharedAnnotation' }
                ],
            },
        },
        operations: {
            createThreadAndReply: {
                operation: 'executeBatch',
                args: ['$batch'],
            },
            findRepliesByCreatorAndPageUrl: {
                operation: 'findObjects',
                collection: 'conversationReply',
                args: {
                    pageCreator: '$pageCreator:pk',
                    normalizedPageUrl: '$normalizedPageUrl:string',
                }
            },
            findRepliesByAnnotation: {
                operation: 'findObjects',
                collection: 'conversationReply',
                args: {
                    sharedAnnotation: '$sharedAnnotation:pk',
                }
            },
        },
        accessRules: {
            // ownership: {
            //     sharedList: {
            //         field: 'creator',
            //         access: ['create', 'update', 'delete'],
            //     },
            // },
            // permissions: {
            //     sharedList: { list: { rule: true }, read: { rule: true } },
            // }
        }
    })

    async createReply(params: CreateConversationReplyParams): Promise<{ reference: ConversationReplyReference }> {
        const batch: OperationBatch = [
            {
                placeholder: 'thread',
                operation: 'createObject',
                collection: 'conversationThread',
                args: {
                    sharedAnnotation: this.options.contentSharing._idFromReference(params.annotationReference),
                    updatedWhen: Date.now(),
                    pageCreator: params.pageCreatorReference.id,
                    normalizedPageUrl: params.normalizedPageUrl,
                }
            },
            {
                placeholder: 'reply',
                operation: 'createObject',
                collection: 'conversationReply',
                args: {
                    user: params.userReference.id,
                    sharedAnnotation: this.options.contentSharing._idFromReference(params.annotationReference),
                    createdWhen: Date.now(),
                    pageCreator: params.pageCreatorReference.id,
                    normalizedPageUrl: params.normalizedPageUrl,
                    ...params.reply
                }
            },
        ]
        const result = await this.operation('createThreadAndReply', { batch })
        return {
            reference: {
                type: 'conversation-reply-reference',
                id: result.info.reply.object.id,
            }
        }
    }

    async getRepliesByCreatorPage(params: {
        pageCreatorReference: UserReference,
        normalizedPageUrl: string
    }) {
        const stored: Array<RawReply> = await this.operation('findRepliesByCreatorAndPageUrl', {
            pageCreator: this.options.contentSharing._idFromReference(params.pageCreatorReference),
            normalizedPageUrl: params.normalizedPageUrl,
        })

        const grouped: {
            [annotationId: string]: Array<PreparedReply>
        } = groupBy(stored.map(reply => {
            return this._prepareReply(reply)
        }), (reply => reply.sharedAnnotation.id))

        return grouped
    }

    async getRepliesByAnnotation(params: {
        annotationReference: SharedAnnotationReference
    }) {
        const stored: Array<RawReply> = await this.operation('findRepliesByAnnotation', {
            sharedAnnotation: this.options.contentSharing._idFromReference(params.annotationReference)
        })
        return stored.map(reply => this._prepareReply(reply))
    }

    _prepareReply(reply: RawReply): PreparedReply {
        return {
            reference: { type: 'conversation-reply-reference', id: reply.id },
            reply: omit(reply, 'sharedPageInfo', 'sharedAnnotation', 'user'),
            sharedAnnotation: { type: 'shared-annotation-reference', id: reply.sharedAnnotation },
            userReference: { type: 'user-reference', id: reply.user }
        }
    }
}
