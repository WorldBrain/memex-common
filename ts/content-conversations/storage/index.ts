import { StorageModule, StorageModuleConfig, StorageModuleConstructorArgs } from '@worldbrain/storex-pattern-modules'
import { STORAGE_VERSIONS } from '../../web-interface/storage/versions'

export default class ContentConversationStorage extends StorageModule {
    constructor(private options: StorageModuleConstructorArgs & {
        autoPkType: 'number' | 'string'
    }) {
        super(options)
    }

    getConfig = (): StorageModuleConfig => ({
        collections: {
            conversationThread: {
                version: STORAGE_VERSIONS[3].date,
                fields: {
                    createdWhen: { type: 'timestamp' },
                    normalizedPageUrl: { type: 'string' },
                },
                relationships: [
                    { childOf: 'user' },
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
            },
        },
        operations: {
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
}
