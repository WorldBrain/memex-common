import { StorageModule, StorageModuleConfig } from '@worldbrain/storex-pattern-modules'
import { UserReference } from "../../web-interface/types/users";
import { STORAGE_VERSIONS } from '../../web-interface/storage/versions'
import { ActivityStreamsStorage } from './types'

export default class StorexActivityStreamsStorage extends StorageModule implements ActivityStreamsStorage {
    getConfig = (): StorageModuleConfig => ({
        collections: {
            homeFeedInfo: {
                version: STORAGE_VERSIONS[4].date,
                fields: {
                    lastSeen: { type: 'timestamp' },
                },
                relationships: [
                    { childOf: 'user' },
                ],
                indices: [
                    { field: 'user', pk: true }
                ]
            },
        },
        operations: {
            createHomeFeedInfo: {
                operation: 'createObject',
                collection: 'homeFeedInfo'
            },
            updateHomeFeedInfo: {
                operation: 'updateObjects',
                collection: 'homeFeedInfo',
                args: [
                    { user: '$user:pk' },
                    { lastSeen: '$lastSeen:pk' },
                ]
            },
            findHomeFeedInfoByUser: {
                operation: 'findObject',
                collection: 'homeFeedInfo',
                args: {
                    user: '$user:pk',
                }
            },
        },
        accessRules: {
            ownership: {
                homeFeedInfo: {
                    field: 'user',
                    access: ['create', 'update', 'read'],
                },
            },
        }
    })

    async updateHomeFeedTimestamp(params: { user: UserReference, timestamp: number }): Promise<{ previousTimestamp: number | null }> {
        const existing = await this.operation('findHomeFeedInfoByUser', { user: params.user.id })
        if (existing) {
            await this.operation('updateHomeFeedInfo', { user: params.user.id, lastSeen: params.timestamp })
        } else {
            await this.operation('createHomeFeedInfo', { user: params.user.id, lastSeen: params.timestamp })
        }
        return { previousTimestamp: existing?.lastSeen ?? null }
    }

    async retrieveHomeFeedTimestamp(params: { user: UserReference }): Promise<{ timestamp: number } | null> {
        const existing = await this.operation('findHomeFeedInfoByUser', { user: params.user.id })
        return existing?.lastSeen ?? null
    }
}
