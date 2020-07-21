import { StorageModule, StorageModuleConstructorArgs, StorageModuleConfig } from '@worldbrain/storex-pattern-modules'
import { STORAGE_VERSIONS } from '../../web-interface/storage/versions'
import { SharedList, SharedListEntry, SharedListReference } from '../types'
import { UserReference } from '../../web-interface/types/users'

interface StoredSharedListReference extends SharedListReference {
    id: string | number
}

export default class ContentSharingStorage extends StorageModule {
    constructor(private options: StorageModuleConstructorArgs & {
        autoPkType: 'number' | 'string'
    }) {
        super(options)
    }

    getConfig = (): StorageModuleConfig => ({
        collections: {
            sharedList: {
                version: STORAGE_VERSIONS[0].date,
                fields: {
                    createdWhen: { type: 'timestamp' },
                    updatedWhen: { type: 'timestamp' },
                    title: { type: 'string' },
                    description: { type: 'string', optional: true },
                },
                relationships: [
                    { alias: 'creator', childOf: 'user' }
                ]
            },
            sharedListCreatorInfo: {
                version: STORAGE_VERSIONS[0].date,
                fields: {
                    localListId: { type: 'timestamp' },
                },
                relationships: [
                    { childOf: 'sharedList' },
                    { alias: 'creator', childOf: 'user' }
                ],
                groupBy: [
                    { key: 'creator', subcollectionName: 'lists' }
                ]
            },
            sharedListEntry: {
                version: STORAGE_VERSIONS[0].date,
                fields: {
                    createdWhen: { type: 'timestamp' },
                    updatedWhen: { type: 'timestamp' },
                    entryTitle: { type: 'string' },
                    normalizedUrl: { type: 'string' },
                    originalUrl: { type: 'string' },
                },
                relationships: [
                    { childOf: 'sharedList' },
                    { alias: 'creator', childOf: 'user' }
                ],
            }
        },
        operations: {
            createSharedList: {
                operation: 'createObject',
                collection: 'sharedList',
            },
            createSharedListCreatorInfo: {
                operation: 'createObject',
                collection: 'sharedListCreatorInfo',
            },
            createListEntries: {
                operation: 'executeBatch',
                args: ['$batch'],
            },
            findListByID: {
                operation: 'findObject',
                collection: 'sharedList',
                args: { id: '$id:pk' }
            },
            findListEntriesByList: {
                operation: 'findObjects',
                collection: 'sharedListEntry',
                args: [
                    { sharedList: '$sharedListID:pk' },
                    { order: [['createdWhen', 'desc']] }
                ]
            },
            findListEntriesByUrl: {
                operation: 'findObjects',
                collection: 'sharedListEntry',
                args: {
                    sharedList: '$sharedList:pk',
                    normalizedUrl: '$normalizedUrl:string'
                }
            },
            deleteListEntriesByIds: {
                operation: 'deleteObjects',
                collection: 'sharedListEntry',
                args: { id: { $in: '$ids:array:pk' } }
            },
            updateListTitle: {
                operation: 'updateObjects',
                collection: 'sharedList',
                args: [
                    { id: '$id' },
                    { title: '$newTitle' }
                ]
            }
        },
        accessRules: {
            ownership: {
                sharedList: {
                    field: 'creator',
                    access: ['create', 'update', 'delete'],
                },
                sharedListCreatorInfo: {
                    field: 'creator',
                    access: ['create', 'update', 'delete'],
                },
                sharedListEntry: {
                    field: 'creator',
                    access: ['create', 'update', 'delete'],
                },
            },
            permissions: {
                sharedList: { list: { rule: true }, read: { rule: true } },
                sharedListCreatorInfo: { list: { rule: true }, read: { rule: true } },
                sharedListEntry: { list: { rule: true }, read: { rule: true } },
            }
        }
    })

    async createSharedList(options: {
        listData: Omit<SharedList, 'createdWhen' | 'updatedWhen'>
        localListId: number,
        userReference: UserReference
    }): Promise<SharedListReference> {
        const sharedList = (await this.operation('createSharedList', {
            ...options.listData,
            creator: options.userReference.id,
            createdWhen: '$now',
            updatedWhen: '$now',
            description: options.listData.description ?? null,
        })).object
        const reference: StoredSharedListReference = { type: 'shared-list-reference', id: sharedList.id }
        await this.operation('createSharedListCreatorInfo', {
            creator: options.userReference.id,
            sharedList: reference.id,
            localListId: options.localListId,
        })
        return reference
    }

    async createListEntries(options: {
        listReference: SharedListReference,
        listEntries: Array<Omit<SharedListEntry, 'createdWhen' | 'updatedWhen'> & { createdWhen?: number | '$now' }>,
        userReference: UserReference
    }) {
        await this.operation('createListEntries', {
            batch: options.listEntries.map(entry => ({
                operation: 'createObject',
                collection: 'sharedListEntry',
                args: {
                    sharedList: (options.listReference as StoredSharedListReference).id,
                    creator: options.userReference.id,
                    createdWhen: '$now', // may be overwritten by entry content
                    updatedWhen: '$now',
                    ...entry,
                }
            }))
        })
    }

    async removeListEntries(options: {
        listReference: SharedListReference,
        normalizedUrl: string
    }) {
        const entries: Array<{ id: string | number }> = await this.operation('findListEntriesByUrl', {
            sharedList: (options.listReference as StoredSharedListReference).id,
            normalizedUrl: options.normalizedUrl,
        })
        const ids = entries.map(entry => entry.id)
        await this.operation('deleteListEntriesByIds', { ids })
    }

    getSharedListLinkID(listReference: SharedListReference): string {
        const id = (listReference as StoredSharedListReference).id
        return typeof id === "string" ? id : id.toString()
    }

    getSharedListReferenceFromLinkID(id: string): SharedListReference {
        const reference: StoredSharedListReference = { type: 'shared-list-reference', id }
        return reference
    }

    async retrieveList(listReference: SharedListReference): Promise<{
        sharedList: SharedList,
        entries: Array<SharedListEntry & { sharedList: SharedListReference }>,
        creator: UserReference
    } | null> {
        const id = (listReference as StoredSharedListReference).id
        const sharedList: SharedList & { creator: string } = await this.operation('findListByID', { id })
        if (!sharedList) {
            return null
        }

        const rawEntries = await this.operation('findListEntriesByList', { sharedListID: id })
        const entries: Array<SharedListEntry & { sharedList: SharedListReference }> = rawEntries.map(
            (entry: SharedListEntry & { sharedList: string | number }) => ({
                ...entry,
                sharedList: { type: 'shared-list-reference', id: entry.sharedList } as StoredSharedListReference
            })
        )
        return { sharedList, entries, creator: { type: 'user-reference', id: sharedList.creator } }
    }

    async updateListTitle(listReference: SharedListReference, newTitle: string) {
        await this.operation('updateListTitle', {
            id: this._idFromListReference(listReference as StoredSharedListReference),
            newTitle
        })
    }

    _idFromListReference(listReference: StoredSharedListReference): number | string {
        let id = listReference.id
        if (this.options.autoPkType === 'number' && typeof id === 'string') {
            id = parseInt(id)
        }
        return id
    }
}
