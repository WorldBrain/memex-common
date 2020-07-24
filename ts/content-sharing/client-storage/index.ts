import {
    StorageModule,
    StorageModuleConfig,
} from '@worldbrain/storex-pattern-modules'
import { STORAGE_VERSIONS } from '../../browser-extension/storage/versions'
import { ContentSharingAction } from './types'

export class ContentSharingClientStorage extends StorageModule {
    getConfig(): StorageModuleConfig {
        const config: StorageModuleConfig = {
            collections: {
                sharedListMetadata: {
                    version: STORAGE_VERSIONS[20].version,
                    fields: {
                        localId: { type: 'int' },
                        remoteId: { type: 'string' },
                    },
                    indices: [{ field: 'localId', pk: true }],
                },
                contentSharingAction: {
                    version: STORAGE_VERSIONS[20].version,
                    fields: {
                        createdWhen: { type: 'timestamp' },
                        action: { type: 'json' },
                    },
                    indices: [{ field: 'createdWhen' }],
                    backup: false,
                    watch: false,
                },
            },
            operations: {
                createMetadata: {
                    operation: 'createObject',
                    collection: 'sharedListMetadata',
                },
                getMetadata: {
                    operation: 'findObject',
                    collection: 'sharedListMetadata',
                    args: { localId: '$localId:number' },
                },
                getMetadataForLists: {
                    operation: 'findObjects',
                    collection: 'sharedListMetadata',
                    args: { localId: { $in: '$localIds' } },
                },
                getPages: {
                    // TODO: Probably doesn't belong here
                    operation: 'findObjects',
                    collection: 'pages',
                    args: { url: { $in: '$normalizedPageUrls' } },
                },
                createAction: {
                    operation: 'createObject',
                    collection: 'contentSharingAction',
                },
                getOldestAction: {
                    operation: 'findObject',
                    collection: 'contentSharingAction',
                    args: [{}, { order: [['createdWhen', 'asc']] }],
                },
                deleteActionById: {
                    operation: 'deleteObject',
                    collection: 'contentSharingAction',
                    args: { id: '$actionId' },
                },
            },
        }
        return config
    }

    async storeListId(params: { localId: number; remoteId: string }) {
        const existing = await this.operation('getMetadata', params)
        if (existing) {
            throw new Error(`List #${params.localId} already has server ID`)
        }
        await this.operation('createMetadata', {
            ...params,
        })
    }

    async getRemoteListId(params: { localId: number }): Promise<string | null> {
        const existing = await this.operation('getMetadata', params)
        return existing?.remoteId ?? null
    }

    async getPageTitles(params: { normalizedPageUrls: string[] }) {
        // TODO: Probably doesn't belong here
        const titles: { [pageUrl: string]: string } = {}
        for (const page of await this.operation('getPages', params)) {
            titles[page.url] = page.fullTitle
        }
        return titles
    }

    async areListsShared(params: { localIds: number[] }) {
        const allMetadata = await this.operation('getMetadataForLists', params)
        const shared: { [listId: number]: boolean } = {}
        for (const listMetadata of allMetadata) {
            shared[listMetadata.localId] = true
        }
        for (const localId of params.localIds) {
            if (!shared[localId]) {
                shared[localId] = false
            }
        }
        return shared
    }

    async queueAction(params: {
        action: ContentSharingAction
    }): Promise<{ actionId: number }> {
        const { object } = await this.operation('createAction', {
            createdWhen: '$now',
            ...params,
        })
        return { actionId: object.id }
    }

    async peekAction(): Promise<
        (ContentSharingAction & { id: number }) | null
    > {
        const firstAction = await this.operation('getOldestAction', {})
        return firstAction
            ? {
                id: firstAction.id,
                ...firstAction.action,
            }
            : null
    }

    async removeAction(params: { actionId: number }) {
        await this.operation('deleteActionById', params)
    }
}
