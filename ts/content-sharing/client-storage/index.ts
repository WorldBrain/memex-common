import fromPairs from 'lodash/fromPairs'
import {
    StorageModule,
    StorageModuleConfig,
} from '@worldbrain/storex-pattern-modules'
import { STORAGE_VERSIONS } from '../../browser-extension/storage/versions'
import { SharedListMetadata, StoredContentSharingAction } from './types'

export class ContentSharingClientStorage extends StorageModule {
    getConfig = (): StorageModuleConfig => {
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
                sharedAnnotationMetadata: {
                    version: STORAGE_VERSIONS[21].version,
                    fields: {
                        localId: { type: 'string' },
                        remoteId: { type: 'string' },
                        excludeFromLists: { type: 'boolean', optional: true },
                    },
                    indices: [
                        { field: 'localId', pk: true },
                        { field: 'remoteId' },
                    ],
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
                createListMetadata: {
                    operation: 'createObject',
                    collection: 'sharedListMetadata',
                },
                getListMetadata: {
                    operation: 'findObject',
                    collection: 'sharedListMetadata',
                    args: { localId: '$localId:number' },
                },
                getListMetadataByRemoteId: {
                    operation: 'findObject',
                    collection: 'sharedListMetadata',
                    args: { remoteId: '$remoteId:string' },
                },
                getMetadataForList: {
                    operation: 'findObject',
                    collection: 'sharedListMetadata',
                    args: { localId: '$localId:pk' },
                },
                getMetadataForLists: {
                    operation: 'findObjects',
                    collection: 'sharedListMetadata',
                    args: { localId: { $in: '$localIds:array:pk' } },
                },
                getAllSharedListMetadata: {
                    operation: 'findObjects',
                    collection: 'sharedListMetadata',
                    args: {},
                },
                createAnnotationMetadata: {
                    operation: 'createObject',
                    collection: 'sharedAnnotationMetadata',
                },
                getAnnotationMetadata: {
                    operation: 'findObject',
                    collection: 'sharedAnnotationMetadata',
                    args: { localId: '$localId:number' },
                },
                getMetadataForAnnotations: {
                    operation: 'findObjects',
                    collection: 'sharedAnnotationMetadata',
                    args: { localId: { $in: '$localIds:array:pk' } },
                },
                deleteAnnotationMetadata: {
                    operation: 'deleteObjects',
                    collection: 'sharedAnnotationMetadata',
                    args: { localId: { $in: '$localIds:array:pk' } },
                },
                updateAnnotationsExcludedFromLists: {
                    operation: 'updateObjects',
                    collection: 'sharedAnnotationMetadata',
                    args: [
                        { localId: { $in: '$localIds:array:pk' } },
                        { excludeFromLists: '$excludeFromLists:boolean' },
                    ],
                },

                getPages: {
                    // TODO: Doesn't belong here
                    operation: 'findObjects',
                    collection: 'pages',
                    args: { url: { $in: '$normalizedPageUrls' } },
                },
                getPage: {
                    // TODO: Doesn't belong here
                    operation: 'findObject',
                    collection: 'pages',
                    args: { url: '$normalizedPageUrl' },
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
        const existing = await this.operation('getListMetadata', params)
        if (existing) {
            throw new Error(`List #${params.localId} already has server ID`)
        }
        await this.operation('createListMetadata', {
            ...params,
        })
    }

    async getLocalListId(params: { remoteId: string }): Promise<string | null> {
        const existing = await this.operation(
            'getListMetadataByRemoteId',
            params,
        )
        return existing?.localId ?? null
    }

    async getRemoteListId(params: { localId: number }): Promise<string | null> {
        const existing = await this.operation('getListMetadata', params)
        return existing?.remoteId ?? null
    }

    async getAllRemoteListIds(): Promise<{ [localId: number]: string }> {
        const metadataObjects: SharedListMetadata[] = await this.operation(
            'getAllSharedListMetadata',
            {},
        )

        return fromPairs(
            metadataObjects.map((object) => [object.localId, object.remoteId]),
        )
    }

    async getRemoteListIds(params: {
        localIds: number[]
    }): Promise<{ [localId: number]: string }> {
        const metadataObjects: SharedListMetadata[] = []
        for (const localId of params.localIds) {
            const metadata: SharedListMetadata | null = await this.operation(
                'getMetadataForList',
                { localId },
            )
            if (!metadata) {
                continue
            }
            metadataObjects.push(metadata)
        }
        return fromPairs(
            metadataObjects.map((object) => [object.localId, object.remoteId]),
        )
    }

    async storeAnnotationMetadata(
        annotationMetadataList: Array<{
            localId: string
            remoteId: string
            excludeFromLists: boolean
        }>,
    ) {
        for (const annotationMetadata of annotationMetadataList) {
            await this.operation('createAnnotationMetadata', annotationMetadata)
        }
    }

    async setAnnotationsExcludedFromLists(params: {
        localIds: string[]
        excludeFromLists: boolean
    }) {
        await this.operation('updateAnnotationsExcludedFromLists', params)
    }

    async deleteAnnotationMetadata(params: { localIds: string[] }) {
        await this.operation('deleteAnnotationMetadata', params)
    }

    async getRemoteAnnotationIds(params: {
        localIds: string[]
    }): Promise<{ [localId: string]: string | number }> {
        const metadataObjects: Array<{
            localId: string
            remoteId: string | number
        }> = await this.operation('getMetadataForAnnotations', params)
        return fromPairs(
            metadataObjects.map((object) => [object.localId, object.remoteId]),
        )
    }

    async getRemoteAnnotationMetadata(params: {
        localIds: string[]
    }): Promise<{
        [localId: string]: {
            localId: string
            remoteId: string | number
            excludeFromLists?: boolean
        }
    }> {
        const metadataObjects: Array<{
            localId: string
            remoteId: string | number
        }> = await this.operation('getMetadataForAnnotations', params)
        return fromPairs(
            metadataObjects.map((object) => [object.localId, object]),
        )
    }

    async _getPages(params: { normalizedPageUrls: string[] }) {
        const foundPages = (await Promise.all(
            params.normalizedPageUrls.map((normalizedPageUrl) =>
                this.operation('getPage', { normalizedPageUrl }),
            ),
        )) as Array<{ url: string; fullUrl: string; fullTitle: string }>
        return foundPages.filter((page) => !!page)
    }

    async getPageTitles(params: { normalizedPageUrls: string[] }) {
        // TODO: Doesn't belong here
        const titles: { [pageUrl: string]: string } = {}
        for (const page of await this._getPages(params)) {
            titles[page.url] = page.fullTitle
        }
        return titles
    }

    async getPages(params: { normalizedPageUrls: string[] }) {
        // TODO: Doesn't belong here
        const pages: {
            [pageUrl: string]: {
                normalizedUrl: string
                originalUrl: string
                fullTitle: string
            }
        } = {}
        for (const page of await this._getPages(params)) {
            pages[page.url] = {
                normalizedUrl: page.url,
                originalUrl: page.fullUrl,
                fullTitle: page.fullTitle,
            }
        }
        return pages
    }

    async areListsShared(params: {
        localIds: number[]
    }): Promise<{ [listId: number]: boolean }> {
        const remoteListIds = await this.getRemoteListIds(params)

        return fromPairs(
            params.localIds.map((localId) => [
                localId,
                remoteListIds[localId] != null,
            ]),
        )
    }

    async queueAction(params: {
        action: StoredContentSharingAction
        id?: number
    }): Promise<{ actionId: number }> {
        const { object } = await this.operation('createAction', {
            createdWhen: '$now',
            ...params,
        })
        return { actionId: object.id }
    }

    async peekAction(): Promise<
        (StoredContentSharingAction & { id: number }) | null
    > {
        const firstAction = await this.operation('getOldestAction', {})
        return firstAction
            ? {
                  ...firstAction.action,
                  id: firstAction.id,
              }
            : null
    }

    async removeAction(params: { actionId: number }) {
        await this.operation('deleteActionById', params)
    }
}
