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
                // groupBy: [
                //     { key: 'sharedList', subcollectionName: 'entries' }
                // ]
            }
        },
        operations: {
            createSharedList: {
                operation: 'createObject',
                collection: 'sharedList',
            },
            createListEntries: {
                operation: 'executeBatch',
                args: ['$batch'],
            },
            findListByID: {
                operation: 'findObject',
                collection: 'sharedList',
                args: { id: '$id' }
            },
            findListEntriesByList: {
                operation: 'findObjects',
                collection: 'sharedListEntry',
                args: { sharedList: '$sharedListID' }
            },
            updateListTitle: {
                operation: 'updateObjects',
                collection: 'sharedList',
                args: [
                    { id: '$id' },
                    { title: '$newTitle' }
                ]
            }
        }
    })

    async createSharedList(options: {
        listData: Omit<SharedList, 'createdWhen' | 'updatedWhen'>
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
        return reference
    }

    async createListEntries(options: {
        listReference: SharedListReference,
        listEntries: Omit<SharedListEntry, 'createdWhen' | 'updatedWhen'>[],
        userReference: UserReference
    }) {
        await this.operation('createListEntries', {
            batch: options.listEntries.map(entry => ({
                operation: 'createObject',
                collection: 'sharedListEntry',
                args: {
                    sharedList: (options.listReference as StoredSharedListReference).id,
                    creator: options.userReference.id,
                    createdWhen: '$now',
                    updatedWhen: '$now',
                    ...entry,
                }
            }))
        })
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
