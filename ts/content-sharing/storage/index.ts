import chunk from 'lodash/chunk'
import orderBy from 'lodash/orderBy'
import { OperationBatch, StorageBackend } from '@worldbrain/storex'
import { StorageModule, StorageModuleConstructorArgs, StorageModuleConfig } from '@worldbrain/storex-pattern-modules'
import { STORAGE_VERSIONS } from '../../web-interface/storage/versions'
import * as types from '../types'
import { UserReference } from '../../web-interface/types/users'
import { GetAnnotationListEntriesResult, GetAnnotationsResult } from './types'

type StorexReference<Type> = Type & { id: string | number }
type StoredSharedListReference = StorexReference<types.SharedListReference>
type StoredSharedPageInfoReference = StorexReference<types.SharedPageInfoReference>
type StoredSharedAnnotationReference = StorexReference<types.SharedAnnotationReference>
type StoredSharedAnnotationListEntryReference = StorexReference<types.SharedAnnotationListEntryReference>

const PAGE_LIST_ENTRY_ORDER = 'desc'
const ANNOTATION_LIST_ENTRY_ORDER = 'asc'

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
            sharedPageInfo: {
                version: STORAGE_VERSIONS[2].date,
                fields: {
                    createdWhen: { type: 'timestamp' },
                    updatedWhen: { type: 'timestamp' },
                    normalizedUrl: { type: 'string' },
                    originalUrl: { type: 'string' },
                    fullTitle: { type: 'string' },
                },
                relationships: [
                    { alias: 'creator', childOf: 'user' }
                ]
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
                    { order: [['createdWhen', PAGE_LIST_ENTRY_ORDER]] }
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
            findSingleEntryByUserAndUrl: {
                operation: 'findObject',
                collection: 'sharedListEntry',
                args: [
                    {
                        creator: '$creator:pk',
                        normalizedUrl: '$normalizedUrl:string'
                    },
                    { limit: 1 }
                ]
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
            createPageInfo: {
                operation: 'createObject',
                collection: 'sharedPageInfo',
            },
            findPageInfoById: {
                operation: 'findObject',
                collection: 'sharedPageInfo',
                args: {
                    id: '$id:pk'
                }
            },
            findPageInfoByCreatorAndUrl: {
                operation: 'findObject',
                collection: 'sharedPageInfo',
                args: {
                    normalizedUrl: '$normalizedUrl:string',
                    creator: '$creator:pk'
                }
            },
            createAnnotationsAndEntries: {
                operation: 'executeBatch',
                args: ['$batch'],
            },
            createAnnotationListEntries: {
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
                    { order: [['createdWhen', ANNOTATION_LIST_ENTRY_ORDER]] }
                ]
            },
            findAnnotationEntriesByList: {
                operation: 'findObjects',
                collection: 'sharedAnnotationListEntry',
                args: [
                    {
                        sharedList: '$sharedList:pk',
                    },
                    { order: [['createdWhen', ANNOTATION_LIST_ENTRY_ORDER]] }
                ]
            },
            findAnnotationsByIds: {
                operation: 'findObjects',
                collection: 'sharedAnnotation',
                args: {
                    id: { $in: '$ids:array:pk' }
                }
            },
            findAnnotationById: {
                operation: 'findObject',
                collection: 'sharedAnnotation',
                args: {
                    id: '$id:pk'
                }
            },
            findAnnotationsByCreatorAndPageUrl: {
                operation: 'findObjects',
                collection: 'sharedAnnotation',
                args: {
                    creator: '$creator:pk',
                    normalizedPageUrl: '$normalizedPageUrl:pk',
                }
            },
            findAnnotationEntriesForAnnotations: {
                operation: 'findObjects',
                collection: 'sharedAnnotationListEntry',
                args: {
                    sharedAnnotation: { $in: '$sharedAnnotations:array:pk' },
                }
            },
            deleteAnnotationEntries: {
                operation: 'executeBatch',
                args: ['$batch'],
            },
            deleteAnnotations: {
                operation: 'executeBatch',
                args: ['$batch'],
            },
            updateAnnotationComment: {
                operation: 'updateObjects',
                collection: 'sharedAnnotation',
                args: [
                    { id: '$id:pk' },
                    { comment: '$comment:string' }
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
                sharedPageInfo: {
                    field: 'creator',
                    access: ['create', 'update', 'delete'],
                },
                sharedAnnotation: {
                    field: 'creator',
                    access: ['create', 'update', 'delete'],
                },
                sharedAnnotationListEntry: {
                    field: 'creator',
                    access: ['create', 'update', 'delete'],
                },
            },
            permissions: {
                sharedList: { list: { rule: true }, read: { rule: true } },
                sharedListCreatorInfo: { list: { rule: true }, read: { rule: true } },
                sharedListEntry: { list: { rule: true }, read: { rule: true } },
                sharedPageInfo: { list: { rule: true }, read: { rule: true } },
                sharedAnnotation: { list: { rule: true }, read: { rule: true } },
                sharedAnnotationListEntry: { list: { rule: true }, read: { rule: true } },
            }
        }
    })

    getSharedListLinkID(reference: types.SharedListReference): string {
        const id = (reference as StoredSharedListReference).id
        return typeof id === "string" ? id : id.toString()
    }

    getSharedListReferenceFromLinkID(id: string): types.SharedListReference {
        const reference: StoredSharedListReference = { type: 'shared-list-reference', id }
        return reference
    }

    getSharedPageInfoLinkID(reference: types.SharedPageInfoReference): string {
        const id = (reference as StoredSharedPageInfoReference).id
        return typeof id === "string" ? id : id.toString()
    }

    getSharedPageInfoReferenceFromLinkID(id: string): types.SharedPageInfoReference {
        const reference: StoredSharedPageInfoReference = this._referenceFromLinkId('shared-page-info-reference', id)
        return reference
    }

    getSharedAnnotationLinkID(reference: types.SharedAnnotationReference): string {
        const id = (reference as StoredSharedAnnotationReference).id
        return typeof id === "string" ? id : id.toString()
    }

    getSharedAnnotationReferenceFromLinkID(id: string | number): types.SharedAnnotationReference {
        const reference: StoredSharedAnnotationReference = { type: 'shared-annotation-reference', id }
        return reference
    }

    async createSharedList(options: {
        listData: Omit<types.SharedList, 'createdWhen' | 'updatedWhen'>
        localListId: number,
        userReference: UserReference
    }): Promise<types.SharedListReference> {
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
        listReference: types.SharedListReference,
        listEntries: Array<Omit<types.SharedListEntry, 'createdWhen' | 'updatedWhen'> & { createdWhen?: number | '$now' }>,
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
        listReference: types.SharedListReference,
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

    async retrieveList(listReference: types.SharedListReference): Promise<{
        sharedList: types.SharedList,
        entries: Array<types.SharedListEntry & { sharedList: types.SharedListReference }>,
        creator: UserReference
    } | null> {
        const id = this._idFromReference(listReference as StoredSharedListReference)
        const sharedList: types.SharedList & { creator: string } = await this.operation('findListByID', { id })
        if (!sharedList) {
            return null
        }

        const rawEntries = await this.operation('findListEntriesByList', { sharedListID: id })
        const entries: Array<types.SharedListEntry & { sharedList: types.SharedListReference }> = rawEntries.map(
            (entry: types.SharedListEntry & { sharedList: string | number }) => ({
                ...entry,
                sharedList: { type: 'shared-list-reference', id: entry.sharedList } as StoredSharedListReference
            })
        )
        return { sharedList, entries, creator: { type: 'user-reference', id: sharedList.creator } }
    }

    async updateListTitle(listReference: types.SharedListReference, newTitle: string) {
        await this.operation('updateListTitle', {
            id: this._idFromReference(listReference as StoredSharedListReference),
            newTitle
        })
    }

    async getRandomUserListEntryForUrl(params: {
        creatorReference: UserReference,
        normalizedUrl: string
    }): Promise<{ entry: types.SharedListEntry } | null> {
        const retrievedEntry: null | types.SharedListEntry & {
            id: number | string,
            creator: number | string,
            sharedList: number | string,
        } = await this.operation('findSingleEntryByUserAndUrl', {
            creator: this._idFromReference(params.creatorReference),
            normalizedUrl: params.normalizedUrl
        })
        if (!retrievedEntry) {
            return null
        }

        delete retrievedEntry.id
        delete retrievedEntry.creator
        delete retrievedEntry.sharedList
        return { entry: retrievedEntry as types.SharedListEntry }
    }

    async createPageInfo(params: {
        pageInfo: Omit<types.SharedPageInfo, 'createdWhen' | 'updatedWhen'>,
        creatorReference: UserReference
    }): Promise<types.SharedPageInfoReference> {
        const pageInfo = (await this.operation('createPageInfo', {
            ...params.pageInfo,
            createdWhen: '$now',
            updatedWhen: '$now',
            creator: this._idFromReference(params.creatorReference)
        })).object
        const reference: StoredSharedPageInfoReference = { type: 'shared-page-info-reference', id: pageInfo.id }
        return reference
    }

    async ensurePageInfo(params: {
        pageInfo: Omit<types.SharedPageInfo, 'createdWhen' | 'updatedWhen'>,
        creatorReference: UserReference
    }) {
        const existing = await this.getPageInfoByCreatorAndUrl({
            normalizedUrl: params.pageInfo.normalizedUrl,
            creatorReference: params.creatorReference
        })
        if (existing) {
            return existing.reference
        }
        const reference = await this.createPageInfo(params)
        return reference
    }

    async getPageInfo(reference: types.SharedPageInfoReference) {
        const rawPageInfo: types.SharedPageInfo & {
            id: number | string,
            creator: number | string
        } = await this.operation('findPageInfoById', {
            id: this._idFromReference(reference as StoredSharedPageInfoReference)
        })
        return this._preparePageInfoForUser(rawPageInfo)
    }

    async getPageInfoByCreatorAndUrl(params: {
        normalizedUrl: string,
        creatorReference: UserReference
    }): Promise<{ reference: types.SharedPageInfoReference, pageInfo: types.SharedPageInfo } | null> {
        const rawPageInfo: null | (types.SharedPageInfo & {
            id: number | string,
            creator: number | string
        }) = await this.operation('findPageInfoByCreatorAndUrl', {
            normalizedUrl: params.normalizedUrl,
            creator: this._idFromReference(params.creatorReference)
        })
        return this._preparePageInfoForUser(rawPageInfo)
    }

    _preparePageInfoForUser(rawPageInfo: null | (types.SharedPageInfo & {
        id: number | string,
        creator: number | string
    })) {
        if (!rawPageInfo) {
            return null
        }
        const reference: StoredSharedPageInfoReference = {
            type: 'shared-page-info-reference',
            id: rawPageInfo.id
        }
        const creatorReference: UserReference = {
            type: 'user-reference',
            id: rawPageInfo.creator
        }
        delete rawPageInfo.id
        delete rawPageInfo.creator
        return { reference, pageInfo: rawPageInfo as types.SharedPageInfo, creatorReference }
    }

    async createAnnotations(params: {
        annotationsByPage: {
            [normalizedPageUrl: string]: Array<
                Omit<types.SharedAnnotation, 'normalizedPageUrl' | 'updatedWhen' | 'uploadedWhen'> & { localId: string }
            >
        }
        listReferences: types.SharedListReference[]
        creator: UserReference
    }): Promise<{ sharedAnnotationReferences: { [localId: string]: types.SharedAnnotationReference } }> {
        const batch: OperationBatch = []
        const annotationPlaceholders: { [localId: string]: string } = {}
        const objectCounts = { annotations: 0, entries: 0 }
        for (const [normalizedPageUrl, annotations] of Object.entries(params.annotationsByPage)) {
            for (let annotation of annotations) {
                annotation = { ...annotation }
                const annotationPlaceholder = `annotation-${objectCounts.annotations++}`
                annotationPlaceholders[annotation.localId] = annotationPlaceholder
                delete annotation.localId

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

        const batchResult = await this.operation('createAnnotationsAndEntries', { batch })
        const result: { sharedAnnotationReferences: { [localId: string]: types.SharedAnnotationReference } } = { sharedAnnotationReferences: {} }
        for (const [localId, annotationPlaceholder] of Object.entries(annotationPlaceholders)) {
            result.sharedAnnotationReferences[localId] = {
                type: 'shared-annotation-reference',
                id: batchResult.info[annotationPlaceholder].object.id
            } as StoredSharedAnnotationReference
        }
        return result
    }

    async getAnnotationsForPagesInList(params: {
        listReference: types.SharedListReference,
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
            types.SharedAnnotationListEntry & { creator: number | string, sharedAnnotation: number | string }
        > = await this.operation('findAnnotationEntriesByListPages', {
            sharedList: this._idFromReference(params.listReference as StoredSharedListReference),
            normalizedPageUrls: params.normalizedPageUrls,
        })

        const chunkedEntries: Array<typeof annotationEntries> = chunk(annotationEntries, chunkSize)

        const result: {
            [normalizedPageUrl: string]: Array<{
                // entry: types.SharedAnnotationListEntry
                annotation: types.SharedAnnotation,
            }>
        } = {}
        const annotationChunks: Array<Array<types.SharedAnnotation>> = await Promise.all(chunkedEntries.map(
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
        for (const normalizedPageUrl of Object.keys(result)) {
            result[normalizedPageUrl] = orderBy(result[normalizedPageUrl], [
                ({ annotation }) => annotation.createdWhen,
                ANNOTATION_LIST_ENTRY_ORDER]
            )
        }
        return result
    }

    async getAnnotationListEntries(params: {
        listReference: types.SharedListReference,
    }) {
        const annotationEntries: Array<
            types.SharedAnnotationListEntry & {
                id: number | string,
                creator: number | string,
                sharedAnnotation: number | string,
                sharedList: number | string,
            }
        > = await this.operation('findAnnotationEntriesByList', {
            sharedList:
                this._idFromReference(
                    params.listReference as StoredSharedListReference
                ),
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
        references: types.SharedAnnotationReference[]
    }) {
        const annotations: Array<types.SharedAnnotation & {
            id: number | string
            creator: number | string,
        }> = await this.operation('findAnnotationsByIds', {
            ids: params.references.map(ref => (ref as StoredSharedAnnotationReference).id)
        })

        const returned: GetAnnotationsResult = {}
        for (const annotation of annotations) {
            const id = annotation.id
            returned[id] = this._prepareAnnotationForUser(annotation)
        }
        return returned
    }

    async getAnnotationsByCreatorAndPageUrl(params: {
        creatorReference: UserReference,
        normalizedPageUrl: string
    }): Promise<Array<types.SharedAnnotation & {
        reference: types.SharedAnnotationReference
        creator: UserReference
    }>> {
        const annotations: Array<types.SharedAnnotation & {
            id: number | string
            creator: number | string,
        }> = await this.operation('findAnnotationsByCreatorAndPageUrl', {
            creator: this._idFromReference(params.creatorReference),
            normalizedPageUrl: params.normalizedPageUrl
        })

        const returned: Array<types.SharedAnnotation & {
            reference: types.SharedAnnotationReference
            creator: UserReference
        }> = annotations.map(annotation => this._prepareAnnotationForUser(annotation))
        return returned
    }

    _prepareAnnotationForUser(rawAnnotation: types.SharedAnnotation & {
        id: number | string
        creator: number | string,
    }) {
        const reference: StoredSharedAnnotationReference = {
            type: 'shared-annotation-reference',
            id: rawAnnotation.id
        }

        delete rawAnnotation.id
        const creatorReference: UserReference = { type: 'user-reference', id: rawAnnotation.creator }
        return {
            ...rawAnnotation,
            creator: creatorReference,
            reference,
        }
    }

    async getAnnotation(params: {
        reference: types.SharedAnnotationReference
    }): Promise<{ annotation: types.SharedAnnotation, creatorReference: UserReference } | null> {
        const id = this._idFromReference(params.reference as StoredSharedAnnotationReference)
        const retrievedAnnotation: null | (types.SharedAnnotation & { id: string | number, creator: string | number }) =
            await this.operation('findAnnotationById', { id })
        if (!retrievedAnnotation) {
            return null
        }
        const creatorReference: UserReference = { type: 'user-reference', id: retrievedAnnotation.creator }
        delete retrievedAnnotation.id
        delete retrievedAnnotation.creator
        return {
            annotation: retrievedAnnotation as types.SharedAnnotation,
            creatorReference,
        }
    }

    async addAnnotationsToLists(params: {
        creator: UserReference,
        sharedListReferences: types.SharedListReference[],
        sharedAnnotations: Array<{ reference: types.SharedAnnotationReference, normalizedPageUrl: string, createdWhen: number }>
    }) {
        const batch: OperationBatch = []
        const objectCounts = { entries: 0 }
        for (const { reference: annotationReference, normalizedPageUrl, createdWhen } of params.sharedAnnotations) {
            for (const listReference of params.sharedListReferences) {
                batch.push({
                    placeholder: `entry-${objectCounts.entries++}`,
                    operation: 'createObject',
                    collection: 'sharedAnnotationListEntry',
                    args: {
                        sharedList: this._idFromReference(listReference as StoredSharedListReference),
                        sharedAnnotation: this._idFromReference(annotationReference as StoredSharedAnnotationReference),
                        createdWhen,
                        uploadedWhen: '$now',
                        updatedWhen: '$now',
                        creator: params.creator.id,
                        normalizedPageUrl,
                    }
                })
            }
        }

        await this.operation('createAnnotationListEntries', { batch })
    }

    async removeAnnotationsFromLists(params: {
        sharedListReferences?: types.SharedListReference[],
        sharedAnnotationReferences: Array<types.SharedAnnotationReference>
    }) {
        const batch: OperationBatch = []
        let placeholderCount = 0

        const listIds = params.sharedListReferences && new Set(params.sharedListReferences.map(
            reference => this._idFromReference(reference as StoredSharedListReference)
        ))
        for (const sharedAnnotationChuck of chunk(params.sharedAnnotationReferences, 10)) {
            const annotationEntries: Array<{ id: string | number, sharedList: string | number }> =
                await this.operation('findAnnotationEntriesForAnnotations', {
                    sharedAnnotations: sharedAnnotationChuck.map(
                        sharedAnnotationReference => this._idFromReference(
                            sharedAnnotationReference as StoredSharedAnnotationReference
                        ))
                })

            const filtered = listIds ? annotationEntries.filter(
                annotationEntry => !listIds || listIds.has(annotationEntry.sharedList)
            ) : annotationEntries
            batch.push(...filtered.map(annotationEntry => ({
                placeholder: `deletion-${placeholderCount++}`,
                operation: 'deleteObjects' as 'deleteObjects',
                collection: 'sharedAnnotationListEntry',
                where: {
                    id: annotationEntry.id,
                }
            })))
        }

        for (const batchChuck of chunk(batch, 400)) {
            await this.operation('deleteAnnotationEntries', { batch: batchChuck })
        }
    }

    async removeAnnotations(params: {
        sharedAnnotationReferences: Array<types.SharedAnnotationReference>
    }) {
        await this.removeAnnotationsFromLists(params)

        let placeholderCount = 0
        const batch: OperationBatch = params.sharedAnnotationReferences.map(reference => ({
            placeholder: `deletion-${placeholderCount++}`,
            operation: 'deleteObjects' as 'deleteObjects',
            collection: 'sharedAnnotation',
            where: {
                id: this._idFromReference(reference as StoredSharedAnnotationReference),
            }
        }))

        for (const batchChuck of chunk(batch, 400)) {
            await this.operation('deleteAnnotations', { batch: batchChuck })
        }
    }

    async updateAnnotationComment(params: {
        sharedAnnotationReference: types.SharedAnnotationReference,
        updatedComment: string
    }) {
        await this.operation('updateAnnotationComment', {
            id: this._idFromReference(params.sharedAnnotationReference as StoredSharedAnnotationReference),
            comment: params.updatedComment
        })
    }

    _idFromReference(reference: { id: number | string }): number | string {
        let id = reference.id
        if (this.options.autoPkType === 'number' && typeof id === 'string') {
            id = parseInt(id)
            if (isNaN(id)) {
                id = reference.id
            }
        }
        return id
    }

    _referenceFromLinkId<Type extends string>(type: Type, id: string) {
        const reference: { type: Type, id: number | string } = {
            type,
            id: this.options.autoPkType === 'string' ? id : parseInt(id)
        }
        return reference
    }
}
