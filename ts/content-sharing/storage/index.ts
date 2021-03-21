import chunk from 'lodash/chunk'
import orderBy from 'lodash/orderBy'
import { OperationBatch } from '@worldbrain/storex'
import { StorageModule, StorageModuleConstructorArgs, StorageModuleConfig, PermissionRule } from '@worldbrain/storex-pattern-modules'
import { STORAGE_VERSIONS } from '../../web-interface/storage/versions'
import * as types from '../types'
import { UserReference } from '../../web-interface/types/users'
import { GetAnnotationListEntriesResult, GetAnnotationsResult } from './types'
import { idFromAutoPkReference, autoPkReferenceFromLinkId, augmentObjectWithReferences } from '../../storage/references'
import { CONTENT_SHARING_STORAGE_COLLECTIONS } from './collections'
import { CONTENT_SHARING_OPERATIONS } from './operations'
import { CONTENT_SHARING_STORAGE_ACCESS_RULES } from './access-rules'
import { ANNOTATION_LIST_ENTRY_ORDER } from './constants'

export default class ContentSharingStorage extends StorageModule {
    constructor(private options: StorageModuleConstructorArgs & {
        autoPkType: 'number' | 'string'
    }) {
        super(options)
    }

    getConfig = (): StorageModuleConfig => ({
        collections: CONTENT_SHARING_STORAGE_COLLECTIONS(),
        operations: CONTENT_SHARING_OPERATIONS,
        accessRules: CONTENT_SHARING_STORAGE_ACCESS_RULES,
    })

    getSharedListLinkID(reference: types.SharedListReference): string {
        const id = reference.id
        return typeof id === "string" ? id : id.toString()
    }

    getSharedListReferenceFromLinkID(id: string): types.SharedListReference {
        return { type: 'shared-list-reference', id }
    }

    getSharedPageInfoLinkID(reference: types.SharedPageInfoReference): string {
        const id = reference.id
        return typeof id === "string" ? id : id.toString()
    }

    getSharedPageInfoReferenceFromLinkID(id: string): types.SharedPageInfoReference {
        return this._referenceFromLinkId('shared-page-info-reference', id)
    }

    getSharedAnnotationLinkID(reference: types.SharedAnnotationReference): string {
        const id = reference.id
        return typeof id === "string" ? id : id.toString()
    }

    getSharedAnnotationReferenceFromLinkID(id: string | number): types.SharedAnnotationReference {
        return { type: 'shared-annotation-reference', id }
    }

    private ensureDBObjectHasStringId = <T extends { id: number | string }>(rawObject: T): Omit<T, 'id'> & { id: string } => ({
        ...rawObject,
        id: rawObject.id.toString(),
    })

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
        const reference: types.SharedListReference = { type: 'shared-list-reference', id: sharedList.id }
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
                placeholder: entry.normalizedUrl,
                operation: 'createObject',
                collection: 'sharedListEntry',
                args: {
                    sharedList: this._idFromReference(options.listReference),
                    creator: options.userReference.id,
                    createdWhen: '$now', // may be overwritten by entry content
                    updatedWhen: entry.createdWhen ?? '$now',
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
            sharedList: this._idFromReference(options.listReference),
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
        const id = this._idFromReference(listReference)
        const sharedList: types.SharedList & { creator: string } = await this.operation('findListByID', { id })
        if (!sharedList) {
            return null
        }

        const rawEntries = await this.operation('findListEntriesByList', { sharedListID: id })
        const entries: Array<types.SharedListEntry & { sharedList: types.SharedListReference }> = rawEntries.map(
            (entry: types.SharedListEntry & { sharedList: string | number }) => ({
                ...entry,
                sharedList: { type: 'shared-list-reference', id: entry.sharedList }
            })
        )
        return { sharedList, entries, creator: { type: 'user-reference', id: sharedList.creator } }
    }

    async updateListTitle(listReference: types.SharedListReference, newTitle: string) {
        await this.operation('updateListTitle', {
            id: this._idFromReference(listReference),
            newTitle
        })
    }

    async getListByReference(reference: types.SharedListReference) {
        const retrievedList = await this.operation('findListByID', {
            id: reference.id,
        })
        const relations = {
            creator: 'user-reference' as UserReference['type'],
        }
        return augmentObjectWithReferences<types.SharedList, types.SharedListReference, typeof relations>(
            retrievedList, 'shared-list-reference', relations
        )
    }

    async getListsByReferences(references: types.SharedListReference[]) {
        const retrievedLists = await this.operation('findListsByIDs', {
            ids: references.map(ref => ref.id),
        })
        const relations = {
            creator: 'user-reference' as UserReference['type'],
        }
        return retrievedLists.map(retrievedList => augmentObjectWithReferences<types.SharedList, types.SharedListReference, typeof relations>(
            retrievedList, 'shared-list-reference', relations
        ))
    }

    async getListEntryByReference(reference: types.SharedListEntryReference) {
        const retrievedEntry = await this.operation('findListEntryById', {
            id: reference.id,
        })
        const relations = {
            sharedList: 'shared-list-reference' as types.SharedListReference['type'],
            creator: 'user-reference' as UserReference['type'],
        }
        return augmentObjectWithReferences<types.SharedListEntry, types.SharedListEntryReference, typeof relations>(
            retrievedEntry, 'shared-list-entry-reference', relations
        )
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
        return { type: 'shared-page-info-reference', id: pageInfo.id }
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
            id: this._idFromReference(reference)
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
        const reference: types.SharedPageInfoReference = {
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
                            sharedList: this._idFromReference(listReference),
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
            }
        }
        return result
    }

    async doesAnnotationExistForPageInList(params: {
        listReference: types.SharedListReference,
        normalizedPageUrl: string
    }): Promise<boolean> {
        const annotation = await this.operation('findSingleAnnotationEntryByListPage', {
            sharedList: this._idFromReference(params.listReference),
            normalizedPageUrl: params.normalizedPageUrl,
        })

        return annotation != null
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
            sharedList: this._idFromReference(params.listReference),
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
                    params.listReference
                ),
        })

        const returned: GetAnnotationListEntriesResult = {}
        for (const entry of annotationEntries) {
            const reference: types.SharedAnnotationListEntryReference = {
                type: 'shared-annotation-list-entry-reference',
                id: entry.id,
            }
            const sharedAnnotation: types.SharedAnnotationReference = {
                type: 'shared-annotation-reference',
                id: entry.sharedAnnotation
            }
            const sharedList: types.SharedListReference = {
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
            ids: params.references.map(ref => ref.id)
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
        const reference: types.SharedAnnotationReference = {
            type: 'shared-annotation-reference',
            id: rawAnnotation.id
        }

        delete rawAnnotation.id
        const creatorReference: UserReference = { type: 'user-reference', id: rawAnnotation.creator }
        return {
            ...rawAnnotation,
            creator: creatorReference,
            reference,
            linkId: this.getSharedAnnotationLinkID(reference)
        }
    }

    async getAnnotation(params: {
        reference: types.SharedAnnotationReference
    }): Promise<{ annotation: types.SharedAnnotation, creatorReference: UserReference } | null> {
        const id = this._idFromReference(params.reference)
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
                        sharedList: this._idFromReference(listReference),
                        sharedAnnotation: this._idFromReference(annotationReference),
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
            reference => this._idFromReference(reference)
        ))
        for (const sharedAnnotationChuck of chunk(params.sharedAnnotationReferences, 10)) {
            const annotationEntries: Array<{ id: string | number, sharedList: string | number }> =
                await this.operation('findAnnotationEntriesForAnnotations', {
                    sharedAnnotations: sharedAnnotationChuck.map(
                        sharedAnnotationReference => this._idFromReference(
                            sharedAnnotationReference
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
                id: this._idFromReference(reference),
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
            id: this._idFromReference(params.sharedAnnotationReference),
            comment: params.updatedComment
        })
    }

    async createListKey(params: { key: Omit<types.SharedListKey, 'createdWhen' | 'updatedWhen'>, listReference: types.SharedListReference }): Promise<{
        keyString: string
    }> {
        const now = Date.now()
        const key = (await this.operation('createListKey', {
            ...params.key,
            createdWhen: now,
            updatedWhen: now,
            sharedList: params.listReference.id,
            disabled: false,
        })).object
        return { keyString: this.ensureDBObjectHasStringId(key).id }
    }

    async getListKeys(params: { listReference: types.SharedListReference }) {
        const retrievedKeys: any[] = await this.operation('findKeysByList', { sharedList: params.listReference.id })
        const relations = {
            user: 'user-reference' as UserReference['type'],
            sharedList: 'shared-list-reference' as types.SharedListReference['type'],
        }
        return retrievedKeys.map(key =>
            augmentObjectWithReferences<types.SharedListKey, types.SharedListKeyReference, typeof relations>(
                this.ensureDBObjectHasStringId(key) as any, 'shared-list-key-reference', relations
            )
        )
    }

    async getListKey(params: {
        listReference: types.SharedListReference,
        keyString: string
    }) {
        const retrievedKey = await this.operation('findListKey', {
            sharedList: params.listReference.id,
            id: params.keyString,
        })
        const relations = {
            user: 'user-reference' as UserReference['type'],
            sharedList: 'shared-list-reference' as types.SharedListReference['type'],
        }
        return augmentObjectWithReferences<types.SharedListKey, types.SharedListKeyReference, typeof relations>(
            this.ensureDBObjectHasStringId(retrievedKey) as any, 'shared-list-key-reference', relations
        )
    }

    async deleteListKey(params: { keyString: string }) {
        const id = this.options.autoPkType === 'number' ? parseInt(params.keyString) : params.keyString
        await this.operation('deleteListKey', { id })
    }

    async getListRole(params: {
        listReference: types.SharedListReference,
        userReference: UserReference
    }) {
        const retrievedRole = await this.operation('findListRole', {
            sharedList: params.listReference.id,
            user: params.userReference.id
        })
        const relations = {
            user: 'user-reference' as UserReference['type'],
            sharedList: 'shared-list-reference' as types.SharedListReference['type'],
        }
        return augmentObjectWithReferences<types.SharedListRole, types.SharedListRoleReference, typeof relations>(
            retrievedRole, 'shared-list-role-reference', relations
        )
    }

    async getListRoles(params: {
        listReference: types.SharedListReference,
    }) {
        const retrievedRoles: Array<any> = await this.operation('findListRoles', {
            sharedList: params.listReference.id,
        })
        const relations = {
            user: 'user-reference' as UserReference['type'],
            sharedList: 'shared-list-reference' as types.SharedListReference['type'],
        }
        return retrievedRoles.map(retrievedRole => augmentObjectWithReferences<types.SharedListRole, types.SharedListRoleReference, typeof relations>(
            retrievedRole, 'shared-list-role-reference', relations
        ))
    }

    async createListRole(params: {
        listReference: types.SharedListReference,
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
        listReference: types.SharedListReference,
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
