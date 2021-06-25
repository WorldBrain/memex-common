import { OperationBatch } from '@worldbrain/storex'
import {
    PersonalCloudUpdateType,
    PersonalCloudUpdatePush,
    TranslationLayerDependencies,
} from '../../types'
import {
    DataChangeType,
    LocationSchemeType,
    ContentLocatorType,
    ContentLocatorFormat,
} from '../../../storage/types'
import {
    PersonalContentLocator,
    PersonalList,
} from '../../../../web-interface/types/storex-generated/personal-cloud'
import { extractIdFromAnnotationUrl } from '../utils'

type DeleteReference = {
    collection: string
    id: number | string
    changeInfo?: any
}

// READ BEFORE EDITING
// `updates` comes from the client-side and can contain tampered data. As sunch,
// any use of data coming from `updates` should be handled with care. There are
// locally defined functions for a few common operations, like `findObjects` and
// `deleteObjects` that scope those operations down to users' personal data. Any
// direct usage of `storageManager` should be handled with care and security in mind.

export async function uploadClientUpdateV24(
    params: TranslationLayerDependencies & {
        update: PersonalCloudUpdatePush
    },
) {
    const { storageManager } = params

    // NOTE: In any operation, userId should overwrite whatever is in the client-side provided object
    // to prevent users from overwriting each others' data
    const create = async (
        collection: string,
        toCreate: any,
        options?: { changeInfo?: any },
    ) => {
        const now = params.getNow()

        const batch: OperationBatch = [
            {
                placeholder: 'creation',
                operation: 'createObject',
                collection,
                args: {
                    createdWhen: now,
                    updatedWhen: now,
                    ...toCreate,
                    user: params.userId,
                    createdByDevice: params.update.deviceId,
                },
            },
            {
                placeholder: 'update-entry',
                operation: 'createObject',
                collection: 'personalDataChange',
                args: maybeWith(
                    {
                        createdWhen: now,
                        user: params.userId,
                        createdByDevice: params.update.deviceId,
                        type: DataChangeType.Create,
                        collection,
                    },
                    {
                        info: options?.changeInfo,
                    },
                ),
                replace: [
                    {
                        path: 'objectId',
                        placeholder: 'creation',
                    },
                ],
            },
        ]
        const result = await storageManager.operation('executeBatch', batch)
        const object = result.info.creation.object
        return object
    }
    const findOrCreate = async (
        collection: string,
        where: any,
        defaults: any = {},
    ) => {
        const existing = await storageManager
            .collection(collection)
            .findObject({ ...where, user: params.userId })
        if (existing) {
            return existing
        }
        return create(collection, { ...where, ...defaults })
    }
    const findOne = async (collection: string, where: any) => {
        return storageManager
            .collection(collection)
            .findObject({ ...where, user: params.userId }) as any
    }
    const findMany = async (collection: string, where: any) => {
        return storageManager
            .collection(collection)
            .findObjects({ ...where, user: params.userId }) as any
    }
    const findContentLocator = async (normalizedUrl: string) => {
        const contentLocator: PersonalContentLocator & {
            id: string | number
            personalContentMetadata: string | number
        } = await findOne('personalContentLocator', {
            locationScheme: LocationSchemeType.NormalizedUrlV1,
            location: normalizedUrl,
        })
        return contentLocator
    }
    const findContentMetadata = async (normalizedUrl: string) => {
        const contentLocator = await findContentLocator(normalizedUrl)
        if (!contentLocator) {
            return { contentMetadata: null, contentLocator: null }
        }
        const contentMetadata = await findOne('personalContentMetadata', {
            id: contentLocator.personalContentMetadata,
        })
        return { contentMetadata, contentLocator }
    }
    const updateById = async (
        collection: string,
        id: number | string,
        updates: any,
        options?: { changeInfo?: any },
    ) => {
        const now = params.getNow()
        const batch: OperationBatch = [
            {
                placeholder: 'update',
                operation: 'updateObjects',
                collection,
                where: { id, user: params.userId },
                updates: {
                    updatedWhen: now,
                    ...updates,
                    user: params.userId,
                },
            },
            {
                placeholder: 'update-entry',
                operation: 'createObject',
                collection: 'personalDataChange',
                args: maybeWith(
                    {
                        createdWhen: now,
                        user: params.userId,
                        createdByDevice: params.update.deviceId,
                        type: DataChangeType.Modify,
                        collection,
                        objectId: id,
                    },
                    {
                        info: options?.changeInfo,
                    },
                ),
            },
        ]
        await storageManager.operation('executeBatch', batch)
    }
    const deleteById = async (
        collection: string,
        id: number | string,
        changeInfo?: any,
    ) => {
        await deleteMany([{ collection, id, changeInfo }])
    }
    const deleteMany = async (references: DeleteReference[]) => {
        const batch: OperationBatch = []
        for (const [index, reference] of references.entries()) {
            batch.push({
                placeholder: `deletion-${index}`,
                operation: 'deleteObjects',
                collection: reference.collection,
                where: {
                    user: params.userId,
                    id: reference.id,
                },
            })
            batch.push({
                placeholder: `entry-${index}`,
                operation: 'createObject',
                collection: 'personalDataChange',
                args: maybeWith(
                    {
                        createdWhen: params.getNow(),
                        user: params.userId,
                        createdByDevice: params.update.deviceId,
                        type: DataChangeType.Delete,
                        collection: reference.collection,
                        objectId: reference.id,
                    },
                    {
                        info: reference.changeInfo,
                    },
                ),
            })
        }
        await storageManager.operation('executeBatch', batch)
    }
    const findTagAssociatedData = async (
        normalizedUrl: string,
    ): Promise<{
        objectId?: string
        collection: 'personalAnnotation' | 'personalContentMetadata'
    }> => {
        const annotationId = extractIdFromAnnotationUrl(normalizedUrl)
        if (annotationId == null) {
            const { contentMetadata } = await findContentMetadata(normalizedUrl)
            return {
                objectId: contentMetadata?.id,
                collection: 'personalContentMetadata',
            }
        }

        const annotation = await findOne('personalAnnotation', {
            localId: annotationId,
        })
        return {
            objectId: annotation?.id,
            collection: 'personalAnnotation',
        }
    }

    const { update } = params
    if (update.collection === 'pages') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const page = update.object
            const normalizedUrl = page.url

            let { contentLocator, contentMetadata } = await findContentMetadata(
                normalizedUrl,
            )
            const updates = {
                canonicalUrl: page.canonicalUrl ?? page.fullUrl,
                title: page.fullTitle,
                lang: page.lang ?? null,
                description: page.description ?? null,
            }

            if (!contentLocator) {
                contentMetadata = await create(
                    'personalContentMetadata',
                    updates,
                )
                contentLocator = await create('personalContentLocator', {
                    personalContentMetadata: contentMetadata.id,
                    locationType: ContentLocatorType.Remote,
                    locationScheme: LocationSchemeType.NormalizedUrlV1,
                    format: ContentLocatorFormat.HTML,
                    location: normalizedUrl,
                    originalLocation: page.fullUrl,
                    version: 0, // TODO: later, when visits are written, this is updated
                    valid: true,
                    primary: true,
                    // contentSize: null,
                    // fingerprint: null,
                    lastVisited: 0,
                })
            } else if (contentMetadata) {
                await updateById(
                    'personalContentMetadata',
                    contentMetadata.id,
                    updates,
                )
            }
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const normalizedUrl = update.where.url as string
            const firstConttentLocator = await findContentLocator(normalizedUrl)
            if (!firstConttentLocator) {
                return
            }
            const allContentLocators: Array<
                PersonalContentLocator & {
                    id: number | string
                }
            > = await findMany('personalContentLocator', {
                personalContentMetadata:
                    firstConttentLocator.personalContentMetadata,
            })
            const normalizedContentLocator = allContentLocators.find(
                (locator) =>
                    locator.locationScheme ===
                    LocationSchemeType.NormalizedUrlV1,
            )

            const references: Array<{
                collection: string
                id: number | string
            }> = allContentLocators.map((locator) => ({
                collection: 'personalContentLocator',
                id: locator.id,
            }))
            await deleteMany([
                {
                    collection: 'personalContentMetadata',
                    id: firstConttentLocator.personalContentMetadata,
                    changeInfo: normalizedContentLocator
                        ? { normalizedUrl: normalizedContentLocator.location }
                        : null,
                },
                ...references,
            ])
        }
    } else if (update.collection === 'annotations') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const annotation = update.object
            const normalizedUrl = annotation.pageUrl
            const { contentMetadata } = await findContentMetadata(normalizedUrl)
            if (!contentMetadata) {
                return
            }
            const updates = {
                personalContentMetadata: contentMetadata.id,
                localId: extractIdFromAnnotationUrl(annotation.url),
                body: annotation.body,
                comment: annotation.comment,
                createdWhen: annotation.createdWhen.getTime(),
                updatedWhen: annotation.lastEdited?.getTime(),
            }

            const existingAnnotation = await findOne('personalAnnotation', {
                localId: updates.localId,
                personalContentMetadata: updates.personalContentMetadata,
            })
            if (!existingAnnotation) {
                const remoteAnnotation = await create(
                    'personalAnnotation',
                    updates,
                )
                if (annotation.selector != null) {
                    await create('personalAnnotationSelector', {
                        selector: annotation.selector,
                        personalAnnotation: remoteAnnotation.id,
                    })
                }
            } else {
                await updateById(
                    'personalAnnotation',
                    existingAnnotation.id,
                    updates,
                )
            }
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const annotationUrl = update.where.url as string
            const localId = extractIdFromAnnotationUrl(annotationUrl)
            const annotation = await findOne('personalAnnotation', { localId })
            if (!annotation) {
                return
            }
            const selector = await findOne('personalAnnotationSelector', {
                personalAnnotation: annotation.id,
            })

            const toDelete: DeleteReference[] = [
                {
                    collection: 'personalAnnotation',
                    id: annotation.id,
                    changeInfo: { url: annotationUrl },
                },
            ]
            if (selector != null) {
                toDelete.push({
                    collection: 'personalAnnotationSelector',
                    id: selector.id,
                })
            }

            await deleteMany(toDelete)
        }
    } else if (update.collection === 'annotationPrivacyLevels') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const annotationPrivacyLevel = update.object
            const localId = extractIdFromAnnotationUrl(
                annotationPrivacyLevel.annotation,
            )
            const annotation = await findOne('personalAnnotation', { localId })
            if (!annotation) {
                return
            }

            const updates = {
                personalAnnotation: annotation.id,
                localId: annotationPrivacyLevel.id,
                privacyLevel: annotationPrivacyLevel.privacyLevel,
                createdWhen: annotationPrivacyLevel.createdWhen.getTime(),
                updatedWhen: annotationPrivacyLevel.updatedWhen.getTime(),
            }

            const existing = await findOne('personalAnnotationPrivacyLevel', {
                personalAnnotation: annotation.id,
            })
            if (existing) {
                await updateById(
                    'personalAnnotationPrivacyLevel',
                    existing.id,
                    updates,
                )
            } else {
                await create('personalAnnotationPrivacyLevel', updates)
            }
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const localId = update.where.id as string
            const existing = await findOne('personalAnnotationPrivacyLevel', {
                localId,
            })

            await deleteById('personalAnnotationPrivacyLevel', existing.id, {
                id: localId,
            })
        }
    } else if (update.collection === 'visits') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const visit = update.object
            const normalizedUrl = visit.url
            const {
                contentMetadata,
                contentLocator,
            } = await findContentMetadata(normalizedUrl)
            if (!contentMetadata) {
                return
            }
            const updates = {
                personalContentMetadata: contentMetadata.id,
                personalContentLocator: contentLocator.id,
                readWhen: visit.time,
                readDuration: visit.duration ?? null,
                progressPercentage: visit.scrollPerc ?? null,
                scrollTotal: visit.scrollMaxPx ?? null,
                scrollProgress: visit.scrollPx ?? null,
            }
            const contentRead = await findOne('personalContentRead', {
                readWhen: visit.time,
                personalContentMetadata: contentMetadata.id,
            })
            if (!contentRead) {
                await create('personalContentRead', updates)
            } else {
                await updateById('personalContentRead', contentRead.id, updates)
            }
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const time = update.where.time
            const normalizedUrl = update.where.url as string

            const { contentMetadata } = await findContentMetadata(normalizedUrl)
            if (!contentMetadata) {
                return
            }

            const contentRead = await findOne('personalContentRead', {
                readWhen: time,
                personalContentMetadata: contentMetadata.id,
            })
            if (!contentRead) {
                return
            }

            await deleteById(
                'personalContentRead',
                contentRead.id,
                update.where,
            )
        }
    } else if (update.collection === 'tags') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const tagName = update.object.name
            const normalizedUrl = update.object.url

            const { objectId, collection } = await findTagAssociatedData(
                normalizedUrl,
            )
            if (!objectId) {
                return
            }

            const tag = await findOrCreate('personalTag', { name: tagName })
            await findOrCreate('personalTagConnection', {
                personalTag: tag.id,
                collection,
                objectId,
            })
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const tagName = update.where.name
            const normalizedUrl = update.where.url as string

            const tag = await findOne('personalTag', { name: tagName })
            if (!tag) {
                return
            }

            const { objectId, collection } = await findTagAssociatedData(
                normalizedUrl,
            )
            if (!objectId) {
                return
            }

            const tagConnection = await findOne('personalTagConnection', {
                personalTag: tag.id,
                collection,
                objectId,
            })
            await deleteById(
                'personalTagConnection',
                tagConnection.id,
                update.where,
            )
        }
    } else if (update.collection === 'customLists') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const localList = update.object
            const updates = {
                name: localList.name,
                localId: localList.id,
                isNestable: localList.isNestable,
                isDeletable: localList.isDeletable,
                createdWhen: localList.createdAt.getTime(),
            }

            const existing = await findOne('personalList', {
                localId: localList.id,
            })
            if (existing) {
                await updateById('personalList', existing.id, updates)
            } else {
                await create('personalList', updates)
            }
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const localId = update.where.id
            const existing = await findOne('personalList', { localId })

            await deleteById('personalList', existing.id, {
                id: localId,
            })
        }
    } else if (update.collection === 'pageListEntries') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const localListEntry = update.object
            const normalizedPageUrl = localListEntry.pageUrl

            const [{ contentMetadata }, list] = await Promise.all([
                findContentMetadata(normalizedPageUrl),
                findOne('personalList', { localId: localListEntry.listId }),
            ])
            if (!contentMetadata || !list) {
                return
            }

            await findOrCreate('personalListEntry', {
                personalContentMetadata: contentMetadata.id,
                personalList: list.id,
                createdWhen: localListEntry.createdAt.getTime(),
            })
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const normalizedPageUrl = update.where.pageUrl as string
            const localListId = update.where.listId

            const [{ contentMetadata }, list] = await Promise.all([
                findContentMetadata(normalizedPageUrl),
                findOne('personalList', { localId: localListId }),
            ])
            const existing = await findOne('personalListEntry', {
                personalContentMetadata: contentMetadata.id,
                personalList: list.id,
            })

            if (!existing) {
                return
            }

            await deleteById('personalListEntry', existing.id, {
                pageUrl: normalizedPageUrl,
                listId: localListId,
            })
        }
    } else if (update.collection === 'sharedListMetadata') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const localListId = update.object.localId as string

            const list = await findOne('personalList', { localId: localListId })
            if (!list) {
                return
            }
            await findOrCreate(
                'personalListShare',
                { personalList: list.id },
                {
                    personalList: list.id,
                    remoteId: update.object.remoteId,
                },
            )
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const localListId = update.where.localId as string

            const list = await findOne('personalList', { localId: localListId })
            if (!list) {
                return
            }
            const existing = await findOne('personalListShare', {
                personalList: list.id,
            })
            if (!existing) {
                return
            }

            await deleteById('personalListShare', existing.id, {
                localId: localListId,
            })
        }
    } else if (update.collection === 'templates') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const localId = update.object.id
            const updates = {
                isFavourite: update.object.isFavourite,
                title: update.object.title,
                code: update.object.code,
                localId,
            }

            const existing = await findOne('personalTextTemplate', { localId })
            if (existing) {
                await updateById('personalTextTemplate', existing.id, updates)
            } else {
                await create('personalTextTemplate', updates)
            }
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const localId = update.where.id
            const existing = await findOne('personalTextTemplate', { localId })

            await deleteById('personalTextTemplate', existing.id, {
                id: localId,
            })
        }
    }
}

function maybeWith(object: any, extras: any) {
    for (const [key, value] of Object.entries(extras)) {
        if (typeof value !== 'undefined' && value !== null) {
            object[key] = value
        }
    }

    return object
}
