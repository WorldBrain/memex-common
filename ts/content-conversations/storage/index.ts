import { OperationBatch } from '@worldbrain/storex'
import { StorageModule, StorageModuleConfig, StorageModuleConstructorArgs } from '@worldbrain/storex-pattern-modules'
import { STORAGE_VERSIONS } from '../../web-interface/storage/versions'
import { UserReference } from '../../web-interface/types/users'
import { SharedAnnotationReference } from '../../content-sharing/types'
import { ConversationReply } from '../../web-interface/types/storex-generated/content-conversations'
import ContentSharingStorage from '../../content-sharing/storage'
import { ConversationReplyReference } from '../types'

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

    async createReply(params: {
        userReference: UserReference,
        annotationReference: SharedAnnotationReference,
        normalizedPageUrl: string,
        reply: Omit<ConversationReply, 'createdWhen' | 'normalizedPageUrl'>
    }): Promise<{ reference: ConversationReplyReference }> {
        const batch: OperationBatch = [
            {
                placeholder: 'thread',
                operation: 'createObject',
                collection: 'conversationThread',
                args: {
                    updatedWhen: Date.now(),
                    normalizedPageUrl: params.normalizedPageUrl,
                    sharedAnnotation: this.options.contentSharing._idFromReference(params.annotationReference),
                }
            },
            {
                placeholder: 'reply',
                operation: 'createObject',
                collection: 'conversationReply',
                args: {
                    createdWhen: Date.now(),
                    user: params.userReference.id,
                    normalizedPageUrl: params.normalizedPageUrl,
                    sharedAnnotation: this.options.contentSharing._idFromReference(params.annotationReference),
                    ...params.reply
                }
            },
        ]
        const result = await this.operation('createThreadAndReply', { batch })
        return {
            reference: {
                type: 'conversation-reply-reference',
                id: result.info.reply.id,
            }
        }
    }
}
