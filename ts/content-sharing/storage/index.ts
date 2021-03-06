import orderBy from 'lodash/orderBy'
import { OperationBatch } from '@worldbrain/storex'
import {
    StorageModule,
    StorageModuleConstructorArgs,
    StorageModuleConfig,
} from '@worldbrain/storex-pattern-modules'
import * as types from '../types'
import { UserReference } from '../../web-interface/types/users'
import { GetAnnotationListEntriesResult, GetAnnotationsResult } from './types'
import {
    idFromAutoPkReference,
    autoPkReferenceFromLinkId,
    augmentObjectWithReferences,
} from '../../storage/references'
import { CONTENT_SHARING_STORAGE_COLLECTIONS } from './collections'
import { CONTENT_SHARING_OPERATIONS } from './operations'
import { CONTENT_SHARING_STORAGE_ACCESS_RULES } from './access-rules'
import { ANNOTATION_LIST_ENTRY_ORDER } from './constants'
import { mapByChunk, forEachChunkAsync } from '../../storage/utils'

export default class ContentSharingStorage extends StorageModule {
    constructor(
        private options: StorageModuleConstructorArgs & {
            autoPkType: 'number' | 'string'
        },
    ) {
        super(options)
    }

    getConfig = (): StorageModuleConfig => ({
        collections: CONTENT_SHARING_STORAGE_COLLECTIONS(),
        operations: CONTENT_SHARING_OPERATIONS,
        accessRules: CONTENT_SHARING_STORAGE_ACCESS_RULES,
    })

    getSharedListLinkID(reference: types.SharedListReference): string {
        const id = reference.id
        return typeof id === 'string' ? id : id.toString()
    }

    getSharedListReferenceFromLinkID(id: string): types.SharedListReference {
        return { type: 'shared-list-reference', id }
    }

    getSharedPageInfoLinkID(reference: types.SharedPageInfoReference): string {
        const id = reference.id
        return typeof id === 'string' ? id : id.toString()
    }

    getSharedPageInfoReferenceFromLinkID(
        id: string,
    ): types.SharedPageInfoReference {
        return this._referenceFromLinkId('shared-page-info-reference', id)
    }

    getSharedAnnotationLinkID(
        reference: types.SharedAnnotationReference,
    ): string {
        const id = reference.id
        return typeof id === 'string' ? id : id.toString()
    }

    getSharedAnnotationReferenceFromLinkID(
        id: string | number,
    ): types.SharedAnnotationReference {
        return { type: 'shared-annotation-reference', id }
    }

    private ensureDBObjectHasStringId<T extends { id: number | string }>(
        rawObject: T,
    ): Omit<T, 'id'> & { id: string } {
        if (!rawObject) {
            return null
        }

        return {
            ...rawObject,
            id: rawObject.id.toString(),
        }
    }

    async createSharedList(options: {
        listData: Omit<types.SharedList, 'createdWhen' | 'updatedWhen'>
        localListId: number
        userReference: UserReference
    }): Promise<types.SharedListReference> {
        const sharedList = (
            await this.operation('createSharedList', {
                ...options.listData,
                creator: options.userReference.id,
                createdWhen: '$now',
                updatedWhen: '$now',
                description: options.listData.description ?? null,
            })
        ).object
        const reference: types.SharedListReference = {
            type: 'shared-list-reference',
            id: sharedList.id,
        }
        await this.operation('createSharedListCreatorInfo', {
            creator: options.userReference.id,
            sharedList: reference.id,
            localListId: options.localListId,
        })
        return reference
    }

    async createListEntries(options: {
        listReference: types.SharedListReference
        listEntries: Array<
            Omit<types.SharedListEntry, 'createdWhen' | 'updatedWhen'> & {
                createdWhen?: number | '$now'
            }
        >
        userReference: UserReference
    }) {
        const existingEntryList = await mapByChunk(
            options.listEntries,
            (entryChunk) =>
                this.operation('findListEntriesByUrls', {
                    sharedList: options.listReference.id,
                    normalizedUrls: entryChunk.map(
                        (entry) => entry.normalizedUrl,
                    ),
                }),
        )

        const existingEntrySet = new Set<string>(
            existingEntryList.map((entry) => entry.normalizedUrl),
        )

        await this.operation('createListEntries', {
            batch: options.listEntries
                .filter((entry) => !existingEntrySet.has(entry.normalizedUrl))
                .map((entry) => ({
                    placeholder: entry.normalizedUrl,
                    operation: 'createObject',
                    collection: 'sharedListEntry',
                    args: {
                        sharedList: this._idFromReference(
                            options.listReference,
                        ),
                        creator: options.userReference.id,
                        createdWhen: '$now', // may be overwritten by entry content
                        updatedWhen: entry.createdWhen ?? '$now',
                        ...entry,
                    },
                })),
        })
    }

    async removeListEntries(options: {
        listReference: types.SharedListReference
        normalizedUrl: string
    }) {
        const entries: Array<{ id: string | number }> = await this.operation(
            'findListEntriesByUrl',
            {
                sharedList: this._idFromReference(options.listReference),
                normalizedUrl: options.normalizedUrl,
            },
        )
        const ids = entries.map((entry) => entry.id)
        if (!ids.length) {
            return
        }
        await mapByChunk(ids, (idChunk) =>
            this.operation('deleteListEntriesByIds', { ids: idChunk }),
        )
    }

    async retrieveList(listReference: types.SharedListReference) {
        const id = this._idFromReference(listReference)
        const rawSharedList = await this.operation('findListByID', { id })
        if (!rawSharedList) {
            return null
        }
        const listRelations = {
            creator: 'user-reference' as UserReference['type'],
        }
        const sharedList = augmentObjectWithReferences<
            types.SharedList,
            types.SharedListReference,
            typeof listRelations
        >(rawSharedList, 'shared-list-reference', listRelations)

        const rawEntries: any[] = await this.operation(
            'findListEntriesByList',
            { sharedListID: id },
        )
        const entryRelations = {
            sharedList: 'shared-list-reference' as types.SharedListReference['type'],
            creator: 'user-reference' as UserReference['type'],
        }
        const entries = rawEntries.map((entry) =>
            augmentObjectWithReferences<
                types.SharedListEntry,
                types.SharedListEntryReference,
                typeof entryRelations
            >(entry, 'shared-list-entry-reference', entryRelations),
        )
        return { sharedList, entries, creator: sharedList.creator }
    }

    async updateListTitle(
        listReference: types.SharedListReference,
        newTitle: string,
    ) {
        await this.operation('updateListTitle', {
            id: this._idFromReference(listReference),
            newTitle,
        })
    }

    async getListByReference(reference: types.SharedListReference) {
        const retrievedList = await this.operation('findListByID', {
            id: reference.id,
        })
        const relations = {
            creator: 'user-reference' as UserReference['type'],
        }
        return augmentObjectWithReferences<
            types.SharedList,
            types.SharedListReference,
            typeof relations
        >(retrievedList, 'shared-list-reference', relations)
    }

    async getListsByReferences(references: types.SharedListReference[]) {
        const retrievedLists = await mapByChunk(references, (referenceChunk) =>
            this.operation('findListsByIDs', {
                ids: referenceChunk.map((ref) => ref.id),
            }),
        )

        const relations = {
            creator: 'user-reference' as UserReference['type'],
        }
        return retrievedLists.map((retrievedList) =>
            augmentObjectWithReferences<
                types.SharedList,
                types.SharedListReference,
                typeof relations
            >(retrievedList, 'shared-list-reference', relations),
        )
    }

    async getListEntryByReference(reference: types.SharedListEntryReference) {
        const retrievedEntry = await this.operation('findListEntryById', {
            id: reference.id,
        })
        const relations = {
            sharedList: 'shared-list-reference' as types.SharedListReference['type'],
            creator: 'user-reference' as UserReference['type'],
        }
        return augmentObjectWithReferences<
            types.SharedListEntry,
            types.SharedListEntryReference,
            typeof relations
        >(retrievedEntry, 'shared-list-entry-reference', relations)
    }

    async getListReferencesByCreator(
        creatorReference: UserReference,
    ): Promise<types.SharedListReference[]> {
        const creatorId = this._idFromReference(creatorReference)
        const rawSharedLists: Array<{
            id: string | number
        }> = await this.operation('findListsByCreator', { creatorId })
        return rawSharedLists.map((rawSharedList) => ({
            id: rawSharedList.id,
            type: 'shared-list-reference',
        }))
    }

    async getRandomUserListEntryForUrl(params: {
        creatorReference: UserReference
        normalizedUrl: string
    }): Promise<{ entry: types.SharedListEntry } | null> {
        const retrievedEntry:
            | null
            | (types.SharedListEntry & {
                  id: number | string
                  creator: number | string
                  sharedList: number | string
              }) = await this.operation('findSingleEntryByUserAndUrl', {
            creator: this._idFromReference(params.creatorReference),
            normalizedUrl: params.normalizedUrl,
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
        pageInfo: Omit<types.SharedPageInfo, 'createdWhen' | 'updatedWhen'>
        creatorReference: UserReference
    }): Promise<types.SharedPageInfoReference> {
        const pageInfo = (
            await this.operation('createPageInfo', {
                ...params.pageInfo,
                createdWhen: '$now',
                updatedWhen: '$now',
                creator: this._idFromReference(params.creatorReference),
            })
        ).object
        return { type: 'shared-page-info-reference', id: pageInfo.id }
    }

    async ensurePageInfo(params: {
        pageInfo: Omit<types.SharedPageInfo, 'createdWhen' | 'updatedWhen'>
        creatorReference: UserReference
    }) {
        const existing = await this.getPageInfoByCreatorAndUrl({
            normalizedUrl: params.pageInfo.normalizedUrl,
            creatorReference: params.creatorReference,
        })
        if (existing) {
            return existing.reference
        }
        const reference = await this.createPageInfo(params)
        return reference
    }

    async getPageInfo(reference: types.SharedPageInfoReference) {
        const rawPageInfo: types.SharedPageInfo & {
            id: number | string
            creator: number | string
        } = await this.operation('findPageInfoById', {
            id: this._idFromReference(reference),
        })
        return this._preparePageInfoForUser(rawPageInfo)
    }

    async getPageInfoByCreatorAndUrl(params: {
        normalizedUrl: string
        creatorReference: UserReference
    }): Promise<{
        reference: types.SharedPageInfoReference
        pageInfo: types.SharedPageInfo
    } | null> {
        const rawPageInfo:
            | null
            | (types.SharedPageInfo & {
                  id: number | string
                  creator: number | string
              }) = await this.operation('findPageInfoByCreatorAndUrl', {
            normalizedUrl: params.normalizedUrl,
            creator: this._idFromReference(params.creatorReference),
        })
        return this._preparePageInfoForUser(rawPageInfo)
    }

    _preparePageInfoForUser(
        rawPageInfo:
            | null
            | (types.SharedPageInfo & {
                  id: number | string
                  creator: number | string
              }),
    ) {
        if (!rawPageInfo) {
            return null
        }
        const reference: types.SharedPageInfoReference = {
            type: 'shared-page-info-reference',
            id: rawPageInfo.id,
        }
        const creatorReference: UserReference = {
            type: 'user-reference',
            id: rawPageInfo.creator,
        }
        delete rawPageInfo.id
        delete rawPageInfo.creator
        return {
            reference,
            pageInfo: rawPageInfo as types.SharedPageInfo,
            creatorReference,
        }
    }

    async createAnnotations(params: {
        annotationsByPage: {
            [normalizedPageUrl: string]: Array<
                Omit<
                    types.SharedAnnotation,
                    'normalizedPageUrl' | 'updatedWhen' | 'uploadedWhen'
                > & { localId: string }
            >
        }
        listReferences: types.SharedListReference[]
        creator: UserReference
    }): Promise<{
        sharedAnnotationReferences: {
            [localId: string]: types.SharedAnnotationReference
        }
        sharedAnnotationListEntryReferences: {
            [localId: string]: types.SharedAnnotationListEntryReference[]
        }
    }> {
        const batch: OperationBatch = []
        const annotationPlaceholders: { [localId: string]: string } = {}
        const annotationEntryPlaceholders: { [localId: string]: string[] } = {}
        const objectCounts = { annotations: 0, entries: 0 }
        for (const [normalizedPageUrl, annotations] of Object.entries(
            params.annotationsByPage,
        )) {
            for (const { localId, ...annotation } of annotations) {
                const annotationPlaceholder = `annotation-${objectCounts.annotations++}`
                annotationPlaceholders[localId] = annotationPlaceholder

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
                        creator: params.creator.id,
                    },
                })

                for (const listReference of params.listReferences) {
                    const listEntryPlaceholder = `entry-${objectCounts.entries++}`
                    annotationEntryPlaceholders[localId] = [
                        ...(annotationEntryPlaceholders[localId] ?? []),
                        listEntryPlaceholder,
                    ]
                    batch.push({
                        placeholder: listEntryPlaceholder,
                        operation: 'createObject',
                        collection: 'sharedAnnotationListEntry',
                        args: {
                            sharedList: this._idFromReference(listReference),
                            createdWhen: annotation.createdWhen ?? '$now',
                            uploadedWhen: '$now',
                            updatedWhen: '$now',
                            creator: params.creator.id,
                            normalizedPageUrl,
                        },
                        replace: [
                            {
                                path: 'sharedAnnotation',
                                placeholder: annotationPlaceholder,
                            },
                        ],
                    })
                }
            }
        }

        const batchResult = await this.operation(
            'createAnnotationsAndEntries',
            { batch },
        )

        const result: {
            sharedAnnotationReferences: {
                [localId: string]: types.SharedAnnotationReference
            }
            sharedAnnotationListEntryReferences: {
                [localId: string]: types.SharedAnnotationListEntryReference[]
            }
        } = {
            sharedAnnotationReferences: {},
            sharedAnnotationListEntryReferences: {},
        }

        for (const [localId, annotationPlaceholder] of Object.entries(
            annotationPlaceholders,
        )) {
            result.sharedAnnotationReferences[localId] = {
                type: 'shared-annotation-reference',
                id: batchResult.info[annotationPlaceholder].object.id,
            }
        }

        for (const [localId, listEntryPlaceholders] of Object.entries(
            annotationEntryPlaceholders,
        )) {
            result.sharedAnnotationListEntryReferences[
                localId
            ] = listEntryPlaceholders.map((placeholder) => ({
                type: 'shared-annotation-list-entry-reference',
                id: batchResult.info[placeholder].object.id,
            }))
        }

        return result
    }

    async doesAnnotationExistForPageInList(params: {
        listReference: types.SharedListReference
        normalizedPageUrl: string
    }): Promise<boolean> {
        const annotation = await this.operation(
            'findSingleAnnotationEntryByListPage',
            {
                sharedList: this._idFromReference(params.listReference),
                normalizedPageUrl: params.normalizedPageUrl,
            },
        )

        return annotation != null
    }

    async getAnnotationsForPagesInList(params: {
        listReference: types.SharedListReference
        normalizedPageUrls: string[]
    }) {
        if (!params.normalizedPageUrls.length) {
            return []
        }
        const chunkSize = 10
        if (params.normalizedPageUrls.length > chunkSize) {
            throw new Error(
                `We can't fetch annotations for more than 10 pages at a time`,
            )
        }

        const annotationEntries: Array<
            types.SharedAnnotationListEntry & {
                creator: number | string
                sharedAnnotation: number | string
            }
        > = await this.operation('findAnnotationEntriesByListPages', {
            sharedList: this._idFromReference(params.listReference),
            normalizedPageUrls: params.normalizedPageUrls,
        })

        const result: {
            [normalizedPageUrl: string]: Array<{
                // entry: types.SharedAnnotationListEntry
                annotation: types.SharedAnnotation
            }>
        } = {}

        const annotations: types.SharedAnnotation[] = await mapByChunk(
            annotationEntries,
            (chunk) =>
                this.operation('findAnnotationsByIds', {
                    ids: chunk.map((entry) => entry.sharedAnnotation),
                }),
            chunkSize,
        )

        for (const annotation of annotations) {
            const pageAnnotations = (result[annotation.normalizedPageUrl] =
                result[annotation.normalizedPageUrl] ?? [])
            pageAnnotations.push({ annotation })
        }

        for (const normalizedPageUrl of Object.keys(result)) {
            result[normalizedPageUrl] = orderBy(result[normalizedPageUrl], [
                ({ annotation }) => annotation.createdWhen,
                ANNOTATION_LIST_ENTRY_ORDER,
            ])
        }
        return result
    }

    async getAnnotationListEntriesForLists(params: {
        listReferences: types.SharedListReference[]
    }) {
        const annotationEntries: Array<
            types.SharedAnnotationListEntry & {
                id: number | string
                creator: number | string
                sharedAnnotation: number | string
                sharedList: number | string
            }
        > = await mapByChunk(params.listReferences, (listRefs) =>
            this.operation('findAnnotationEntriesByLists', {
                sharedLists: listRefs.map((ref) => this._idFromReference(ref)),
            }),
        )

        if ('error' in annotationEntries) {
            throw new Error(annotationEntries['error'])
        }

        const returned: {
            [listId: string]: GetAnnotationListEntriesResult
        } = {}
        for (const entry of annotationEntries) {
            const reference: types.SharedAnnotationListEntryReference = {
                type: 'shared-annotation-list-entry-reference',
                id: entry.id,
            }
            const sharedAnnotation: types.SharedAnnotationReference = {
                type: 'shared-annotation-reference',
                id: entry.sharedAnnotation,
            }
            const sharedList: types.SharedListReference = {
                type: 'shared-list-reference',
                id: entry.sharedList,
            }
            delete entry.id

            returned[entry.sharedList] = {
                ...(returned[entry.sharedList] ?? {}),
                [entry.normalizedPageUrl]: [
                    ...(returned[entry.sharedList]?.[entry.normalizedPageUrl] ??
                        []),
                    {
                        ...entry,
                        reference,
                        creator: {
                            type: 'user-reference',
                            id: entry.creator,
                        },
                        sharedList,
                        sharedAnnotation,
                    },
                ],
            }
        }
        return returned
    }

    async getAnnotationListEntries(params: {
        listReference: types.SharedListReference
    }) {
        const annotationEntries: Array<
            types.SharedAnnotationListEntry & {
                id: number | string
                creator: number | string
                sharedAnnotation: number | string
                sharedList: number | string
            }
        > = await this.operation('findAnnotationEntriesByList', {
            sharedList: this._idFromReference(params.listReference),
        })

        const returned: GetAnnotationListEntriesResult = {}
        for (const entry of annotationEntries) {
            const reference: types.SharedAnnotationListEntryReference = {
                type: 'shared-annotation-list-entry-reference',
                id: entry.id,
            }
            const sharedAnnotation: types.SharedAnnotationReference = {
                type: 'shared-annotation-reference',
                id: entry.sharedAnnotation,
            }
            const sharedList: types.SharedListReference = {
                type: 'shared-list-reference',
                id: entry.sharedList,
            }
            delete entry.id

            const pageEntries = (returned[entry.normalizedPageUrl] =
                returned[entry.normalizedPageUrl] ?? [])
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
        const annotations: Array<
            types.SharedAnnotation & {
                id: number | string
                creator: number | string
            }
        > = await mapByChunk(params.references, (refChunk) =>
            this.operation('findAnnotationsByIds', {
                ids: refChunk.map((ref) => ref.id),
            }),
        )

        const returned: GetAnnotationsResult = {}
        for (const annotation of annotations) {
            const id = annotation.id
            returned[id] = this._prepareAnnotationForUser(annotation)
        }
        return returned
    }

    async getAnnotationsByCreatorAndPageUrl(params: {
        creatorReference: UserReference
        normalizedPageUrl: string
    }): Promise<
        Array<
            types.SharedAnnotation & {
                reference: types.SharedAnnotationReference
                creator: UserReference
            }
        >
    > {
        const annotations: Array<
            types.SharedAnnotation & {
                id: number | string
                creator: number | string
            }
        > = await this.operation('findAnnotationsByCreatorAndPageUrl', {
            creator: this._idFromReference(params.creatorReference),
            normalizedPageUrl: params.normalizedPageUrl,
        })

        const returned: Array<
            types.SharedAnnotation & {
                reference: types.SharedAnnotationReference
                creator: UserReference
            }
        > = annotations.map((annotation) =>
            this._prepareAnnotationForUser(annotation),
        )
        return returned
    }

    _prepareAnnotationForUser(
        rawAnnotation: types.SharedAnnotation & {
            id: number | string
            creator: number | string
        },
    ) {
        const reference: types.SharedAnnotationReference = {
            type: 'shared-annotation-reference',
            id: rawAnnotation.id,
        }

        delete rawAnnotation.id
        const creatorReference: UserReference = {
            type: 'user-reference',
            id: rawAnnotation.creator,
        }
        return {
            ...rawAnnotation,
            creator: creatorReference,
            reference,
            linkId: this.getSharedAnnotationLinkID(reference),
        }
    }

    async getAnnotation(params: {
        reference: types.SharedAnnotationReference
    }): Promise<{
        annotation: types.SharedAnnotation
        creatorReference: UserReference
    } | null> {
        const id = this._idFromReference(params.reference)
        const retrievedAnnotation:
            | null
            | (types.SharedAnnotation & {
                  id: string | number
                  creator: string | number
              }) = await this.operation('findAnnotationById', { id })
        if (!retrievedAnnotation) {
            return null
        }
        const creatorReference: UserReference = {
            type: 'user-reference',
            id: retrievedAnnotation.creator,
        }
        delete retrievedAnnotation.id
        delete retrievedAnnotation.creator
        return {
            annotation: retrievedAnnotation as types.SharedAnnotation,
            creatorReference,
        }
    }

    async addAnnotationsToLists(params: {
        creator: UserReference
        sharedListReferences: types.SharedListReference[]
        sharedAnnotations: Array<{
            reference: types.SharedAnnotationReference
            normalizedPageUrl: string
            createdWhen: number
        }>
    }) {
        const entryHash = (entry: {
            sharedList: number | string
            normalizedPageUrl: string
        }) => `${entry.sharedList}-${entry.normalizedPageUrl}`

        const existingEntryList = await mapByChunk(
            params.sharedAnnotations,
            (annotations) =>
                this.operation('findAnnotationEntriesForAnnotations', {
                    sharedAnnotations: annotations.map((a) => a.reference.id),
                }),
        )

        const existingEntrySet = new Set(
            existingEntryList.map((entry) => entryHash(entry)),
        )

        const batch: OperationBatch = []
        const objectCounts = { entries: 0 }
        for (const {
            reference: annotationReference,
            normalizedPageUrl,
            createdWhen,
        } of params.sharedAnnotations) {
            for (const listReference of params.sharedListReferences) {
                const toCreate = {
                    sharedList: this._idFromReference(listReference),
                    sharedAnnotation: this._idFromReference(
                        annotationReference,
                    ),
                    createdWhen,
                    uploadedWhen: '$now',
                    updatedWhen: '$now',
                    creator: params.creator.id,
                    normalizedPageUrl,
                }
                if (existingEntrySet.has(entryHash(toCreate))) {
                    continue
                }

                batch.push({
                    placeholder: `entry-${objectCounts.entries++}`,
                    operation: 'createObject',
                    collection: 'sharedAnnotationListEntry',
                    args: toCreate,
                })
            }
        }

        await this.operation('createAnnotationListEntries', { batch })
    }

    async removeAnnotationsFromLists(params: {
        sharedListReferences?: types.SharedListReference[]
        sharedAnnotationReferences: Array<types.SharedAnnotationReference>
    }) {
        const batch: OperationBatch = []
        let placeholderCount = 0

        const listIds =
            params.sharedListReferences &&
            new Set(
                params.sharedListReferences.map((reference) =>
                    this._idFromReference(reference),
                ),
            )

        await forEachChunkAsync(
            params.sharedAnnotationReferences,
            async (sharedAnnotationChunk) => {
                const annotationEntries: Array<{
                    id: string | number
                    sharedList: string | number
                }> = await this.operation(
                    'findAnnotationEntriesForAnnotations',
                    {
                        sharedAnnotations: sharedAnnotationChunk.map(
                            (sharedAnnotationReference) =>
                                this._idFromReference(
                                    sharedAnnotationReference,
                                ),
                        ),
                    },
                )

                const filtered = listIds
                    ? annotationEntries.filter(
                          (annotationEntry) =>
                              !listIds ||
                              listIds.has(annotationEntry.sharedList),
                      )
                    : annotationEntries
                batch.push(
                    ...filtered.map((annotationEntry) => ({
                        placeholder: `deletion-${placeholderCount++}`,
                        operation: 'deleteObjects' as 'deleteObjects',
                        collection: 'sharedAnnotationListEntry',
                        where: {
                            id: annotationEntry.id,
                        },
                    })),
                )
            },
        )

        await forEachChunkAsync(
            batch,
            (batchChunk) =>
                this.operation('deleteAnnotationEntries', {
                    batch: batchChunk,
                }),
            400,
        )
    }

    async removeAnnotations(params: {
        sharedAnnotationReferences: Array<types.SharedAnnotationReference>
    }) {
        await this.removeAnnotationsFromLists(params)

        let placeholderCount = 0
        const batch: OperationBatch = params.sharedAnnotationReferences.map(
            (reference) => ({
                placeholder: `deletion-${placeholderCount++}`,
                operation: 'deleteObjects' as 'deleteObjects',
                collection: 'sharedAnnotation',
                where: {
                    id: this._idFromReference(reference),
                },
            }),
        )

        await forEachChunkAsync(
            batch,
            (batchChunk) =>
                this.operation('deleteAnnotations', { batch: batchChunk }),
            400,
        )
    }

    async updateAnnotationComment(params: {
        sharedAnnotationReference: types.SharedAnnotationReference
        updatedComment: string
    }) {
        await this.operation('updateAnnotationComment', {
            id: this._idFromReference(params.sharedAnnotationReference),
            comment: params.updatedComment,
        })
    }

    async createListKey(params: {
        key: Omit<types.SharedListKey, 'createdWhen' | 'updatedWhen'>
        listReference: types.SharedListReference
    }): Promise<{
        keyString: string
    }> {
        const now = Date.now()
        const key = (
            await this.operation('createListKey', {
                ...params.key,
                createdWhen: now,
                updatedWhen: now,
                sharedList: params.listReference.id,
                disabled: false,
            })
        ).object
        return { keyString: this.ensureDBObjectHasStringId(key).id }
    }

    async getListKeys(params: { listReference: types.SharedListReference }) {
        const retrievedKeys: any[] = await this.operation('findKeysByList', {
            sharedList: params.listReference.id,
        })
        const relations = {
            sharedList: 'shared-list-reference' as types.SharedListReference['type'],
        }
        return retrievedKeys.map((key) =>
            augmentObjectWithReferences<
                types.SharedListKey,
                types.SharedListKeyReference,
                typeof relations
            >(
                this.ensureDBObjectHasStringId(key) as any,
                'shared-list-key-reference',
                relations,
            ),
        )
    }

    async getListKey(params: {
        listReference: types.SharedListReference
        keyString: string
    }) {
        const id =
            this.options.autoPkType === 'string'
                ? params.keyString
                : parseInt(params.keyString)
        if (typeof id === 'number' && isNaN(id)) {
            return null
        }
        const retrievedKey = await this.operation('findListKey', {
            sharedList: params.listReference.id,
            id,
        })
        const relations = {
            sharedList: 'shared-list-reference' as types.SharedListReference['type'],
        }
        return augmentObjectWithReferences<
            types.SharedListKey,
            types.SharedListKeyReference,
            typeof relations
        >(
            this.ensureDBObjectHasStringId(retrievedKey) as any,
            'shared-list-key-reference',
            relations,
        )
    }

    async deleteListKey(params: {
        listReference: types.SharedListReference
        keyString: string
    }) {
        await this.operation('deleteListKey', {
            sharedList: params.listReference.id,
            id:
                this.options.autoPkType === 'number'
                    ? parseInt(params.keyString)
                    : params.keyString,
        })
    }

    async getUserListRoles(params: { userReference: UserReference }) {
        const retrievedRoles: Array<any> = await this.operation(
            'findListRolesByUser',
            { user: params.userReference.id },
        )
        const relations = {
            user: 'user-reference' as UserReference['type'],
            sharedList: 'shared-list-reference' as types.SharedListReference['type'],
        }
        return retrievedRoles.map((retrievedRole) =>
            augmentObjectWithReferences<
                types.SharedListRole,
                types.SharedListRoleReference,
                typeof relations
            >(retrievedRole, 'shared-list-role-reference', relations),
        )
    }

    async getListRole(params: {
        listReference: types.SharedListReference
        userReference: UserReference
    }) {
        const retrievedRole = await this.operation('findListRole', {
            sharedList: params.listReference.id,
            user: params.userReference.id,
        })
        const relations = {
            user: 'user-reference' as UserReference['type'],
            sharedList: 'shared-list-reference' as types.SharedListReference['type'],
        }
        return augmentObjectWithReferences<
            types.SharedListRole,
            types.SharedListRoleReference,
            typeof relations
        >(retrievedRole, 'shared-list-role-reference', relations)
    }

    async getListRoles(params: { listReference: types.SharedListReference }) {
        const retrievedRoles: Array<any> = await this.operation(
            'findListRoles',
            {
                sharedList: params.listReference.id,
            },
        )
        const relations = {
            user: 'user-reference' as UserReference['type'],
            sharedList: 'shared-list-reference' as types.SharedListReference['type'],
        }
        return retrievedRoles.map((retrievedRole) =>
            augmentObjectWithReferences<
                types.SharedListRole,
                types.SharedListRoleReference,
                typeof relations
            >(retrievedRole, 'shared-list-role-reference', relations),
        )
    }

    async createListRole(params: {
        listReference: types.SharedListReference
        userReference: UserReference
        roleID: types.SharedListRoleID
    }) {
        await this.operation('createListRole', {
            createdWhen: Date.now(),
            updatedWhen: Date.now(),
            sharedList: params.listReference.id,
            user: params.userReference.id,
            roleID: params.roleID,
        })
    }

    async updateListRole(params: {
        listReference: types.SharedListReference
        userReference: UserReference
        roleID: types.SharedListRoleID
    }) {
        await this.operation('updateListRole', {
            sharedList: params.listReference.id,
            user: params.userReference.id,
            roleID: params.roleID,
        })
    }

    _idFromReference(reference: { id: number | string }): number | string {
        return idFromAutoPkReference(reference, this.options)
    }

    _referenceFromLinkId<Type extends string>(type: Type, id: string) {
        return autoPkReferenceFromLinkId(type, id, this.options)
    }
}
