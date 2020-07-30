import { OperationBatch } from '@worldbrain/storex'
import { StorageModule, StorageModuleConstructorArgs, StorageModuleConfig } from '@worldbrain/storex-pattern-modules'
import { STORAGE_VERSIONS } from '../../web-interface/storage/versions'
import { SharedList, SharedListEntry, SharedListReference, SharedAnnotation, SharedAnnotationListEntry, SharedAnnotationReference, SharedAnnotationListEntryReference } from '../types'
import { UserReference } from '../../web-interface/types/users'
import { GetAnnotationListEntriesResult, GetAnnotationsResult } from './types'

type StorexReference<Type> = Type & { id: string | number }
type StoredSharedListReference = StorexReference<SharedListReference>
type StoredSharedAnnotationReference = StorexReference<SharedAnnotationReference>
type StoredSharedAnnotationListEntryReference = StorexReference<SharedAnnotationListEntryReference>

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
            },
            sharedAnnotation: {
                version: STORAGE_VERSIONS[1].date,
                fields: {
                    normalizedPageUrl: { type: 'string' },
                    createdWhen: { type: 'timestamp' },
                    uploadedWhen: { type: 'timestamp' },
                    updatedWhen: { type: 'timestamp' },
                    body: { type: 'string', optional: true },
                    comment: { type: 'string', optional: true },
                    selector: { type: 'string', optional: true },
                },
                relationships: [
                    { alias: 'creator', childOf: 'user' }
                ]
            },
            sharedAnnotationListEntry: {
                version: STORAGE_VERSIONS[1].date,
                fields: {
                    createdWhen: { type: 'timestamp' },
                    uploadedWhen: { type: 'timestamp' },
                    updatedWhen: { type: 'timestamp' },
                    normalizedPageUrl: { type: 'string' },
                },
                relationships: [
                    { alias: 'creator', childOf: 'user' },
                    { connects: ['sharedList', 'sharedAnnotation'] },
                ],
            },
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
            },
            createAnnotationsAndEntries: {
                operation: 'executeBatch',
                args: ['$batch'],
            },
            findAnnotationEntriesByListPages: {
                operation: 'findObjects',
                collection: 'sharedAnnotationListEntry',
                args: [
                    {
                        sharedList: '$sharedList:pk',
                        normalizedPageUrl: { $in: '$normalizedPageUrls:array:string' },
                    },
                    { order: [['createdWhen', 'desc']] }
                ]
            },
            findAnnotationEntriesByList: {
                operation: 'findObjects',
                collection: 'sharedAnnotationListEntry',
                args: [
                    {
                        sharedList: '$sharedList:pk',
                    },
                    { order: [['createdWhen', 'desc']] }
                ]
            },
            findAnnotationsByIds: {
                operation: 'findObjects',
                collection: 'sharedAnnotation',
                args: {
                    id: { $in: '$ids:array:pk' }
                }
            },
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
                    sharedList: this._idFromReference(options.listReference as StoredSharedListReference),
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
            sharedList: this._idFromReference(options.listReference as StoredSharedListReference),
            normalizedUrl: options.normalizedUrl,
        })
        const ids = entries.map(entry => entry.id)
        if (!ids.length) {
            return
        }
        await this.operation('deleteListEntriesByIds', { ids })
    }

    getSharedListLinkID(reference: SharedListReference): string {
        const id = (reference as StoredSharedListReference).id
        return typeof id === "string" ? id : id.toString()
    }

    getSharedListReferenceFromLinkID(id: string): SharedListReference {
        const reference: StoredSharedListReference = { type: 'shared-list-reference', id }
        return reference
    }

    getSharedAnnotationLinkID(reference: SharedAnnotationReference): string {
        const id = (reference as StoredSharedAnnotationReference).id
        return typeof id === "string" ? id : id.toString()
    }

    getSharedAnnotationReferenceFromLinkID(id: string): SharedAnnotationReference {
        const reference: StoredSharedAnnotationReference = { type: 'shared-annotation-reference', id }
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
            id: this._idFromReference(listReference as StoredSharedListReference),
            newTitle
        })
    }

    async createAnnotations(params: {
        annotationsByPage: {
            [normalizedPageUrl: string]: Array<
                Omit<SharedAnnotation, 'normalizedPageUrl' | 'updatedWhen' | 'uploadedWhen'>
            >
        }
        listReferences: SharedListReference[]
        creator: UserReference
    }) {
        const batch: OperationBatch = []
        const objectCounts = { annotations: 0, entries: 0 }
        for (const [normalizedPageUrl, annotations] of Object.entries(params.annotationsByPage)) {
            for (const annotation of annotations) {
                const annotationPlaceholder = `annotation-${objectCounts.annotations++}`
                batch.push({
                    placeholder: annotationPlaceholder,
                    operation: 'createObject',
                    collection: 'sharedAnnotation',
                    args: {
                        ...annotation,
                        normalizedPageUrl,
                        createdWhen: annotation.createdWhen ?? '$now',
                        uploadedWhen: '$now',
                        updatedWhen: '$now',
                        creator: params.creator.id
                    }
                })

                for (const listReference of params.listReferences) {
                    batch.push({
                        placeholder: `entry-${objectCounts.entries++}`,
                        operation: 'createObject',
                        collection: 'sharedAnnotationListEntry',
                        args: {
                            sharedList: this._idFromReference(listReference as StoredSharedListReference),
                            createdWhen: annotation.createdWhen ?? '$now',
                            uploadedWhen: '$now',
                            updatedWhen: '$now',
                            creator: params.creator.id,
                            normalizedPageUrl,
                        },
                        replace: [
                            { path: 'sharedAnnotation', placeholder: annotationPlaceholder }
                        ]
                    })
                }
            }
        }

        await this.operation('createAnnotationsAndEntries', { batch })
    }

    async getAnnotationsForPagesInList(params: {
        listReference: SharedListReference,
        normalizedPageUrls: string[]
    }) {
        if (!params.normalizedPageUrls.length) {
            return []
        }
        const chunkSize = 10
        if (params.normalizedPageUrls.length > chunkSize) {
            throw new Error(`We can't fetch annotations for more than 10 pages at a time`)
        }

        const annotationEntries: Array<
            SharedAnnotationListEntry & { creator: number | string, sharedAnnotation: number | string }
        > = await this.operation('findAnnotationEntriesByListPages', {
            sharedList: this._idFromReference(params.listReference as StoredSharedListReference),
            normalizedPageUrls: params.normalizedPageUrls,
        })

        const chunkedEntries: Array<typeof annotationEntries> = []
        for (let startIndex = 0; startIndex < annotationEntries.length; startIndex += chunkSize) {
            chunkedEntries.push(annotationEntries.slice(startIndex, chunkSize))
        }

        const result: {
            [normalizedPageUrl: string]: Array<{
                // entry: SharedAnnotationListEntry
                annotation: SharedAnnotation,
            }>
        } = {}
        const annotationChunks: Array<Array<SharedAnnotation>> = await Promise.all(chunkedEntries.map(
            chunk => this.operation('findAnnotationsByIds', {
                ids: chunk.map(entry => entry.sharedAnnotation)
            })
        ))
        for (const annotationChunk of annotationChunks) {
            for (const annotation of annotationChunk) {
                const pageAnnotations = result[annotation.normalizedPageUrl] = result[annotation.normalizedPageUrl] ?? []
                pageAnnotations.push({ annotation })
            }
        }
        return result
    }

    async getAnnotationListEntries(params: {
        listReference: SharedListReference,
    }) {
        const annotationEntries: Array<
            SharedAnnotationListEntry & {
                id: number | string,
                creator: number | string,
                sharedAnnotation: number | string,
                sharedList: number | string,
            }
        > = await this.operation('findAnnotationEntriesByList', {
            sharedList:
                // this._idFromReference(
                params.listReference as StoredSharedListReference
            // ),
        })

        const returned: GetAnnotationListEntriesResult = {}
        for (const entry of annotationEntries) {
            const reference: StoredSharedAnnotationListEntryReference = {
                type: 'shared-annotation-list-entry-reference',
                id: entry.id,
            }
            const sharedAnnotation: StoredSharedAnnotationReference = {
                type: 'shared-annotation-reference',
                id: entry.sharedAnnotation
            }
            const sharedList: StoredSharedListReference = {
                type: 'shared-list-reference',
                id: entry.sharedList
            }
            delete entry.id

            const pageEntries = returned[entry.normalizedPageUrl] = returned[entry.normalizedPageUrl] ?? []
            pageEntries.push({
                ...entry,
                reference,
                creator: { type: 'user-reference', id: entry.creator },
                sharedList,
                sharedAnnotation,
            })
        }
        return returned
    }

    async getAnnotations(params: {
        references: SharedAnnotationReference[]
    }) {
        const annotations: Array<SharedAnnotation & {
            id: number | string
            creator: number | string,
        }> = await this.operation('findAnnotationsByIds', {
            ids: params.references.map(ref => (ref as StoredSharedAnnotationReference).id)
        })

        const returned: GetAnnotationsResult = {}
        for (const annotation of annotations) {
            const reference: StoredSharedAnnotationReference = {
                type: 'shared-annotation-reference',
                id: annotation.id
            }

            const id = annotation.id
            delete annotation.id
            returned[id] = {
                ...annotation,
                creator: { type: 'user-reference', id: annotation.creator },
                reference,
            }
        }
        return returned
    }

    _idFromReference(listReference: { id: number | string }): number | string {
        let id = listReference.id
        if (this.options.autoPkType === 'number' && typeof id === 'string') {
            id = parseInt(id)
        }
        return id
    }
}
