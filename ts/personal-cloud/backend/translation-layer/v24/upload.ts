import {
    PersonalCloudUpdateType,
    PersonalCloudUpdatePush,
    TranslationLayerDependencies,
} from '../../types'
import {
    LocationSchemeType,
    ContentLocatorType,
    ContentLocatorFormat,
} from '../../../storage/types'
import { PersonalContentLocator } from '../../../../web-interface/types/storex-generated/personal-cloud'
import { extractIdFromAnnotationUrl } from '../utils'
import { UploadStorageUtils, DeleteReference } from '../storage-utils'

// READ BEFORE EDITING
// `updates` comes from the client-side and can contain tampered data. As sunch,
// any use of data coming from `updates` should be handled with care. There are
// locally defined functions for a few common operations, like `findObjects` and
// `deleteObjects` that scope those operations down to users' personal data. Any
// direct usage of `storageManager` should be handled with care and security in mind.

export async function uploadClientUpdateV24({
    update,
    ...params
}: TranslationLayerDependencies & {
    update: PersonalCloudUpdatePush
}) {
    const storageUtils = new UploadStorageUtils({ ...params, update })

    if (update.collection === 'pages') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const page = update.object
            const normalizedUrl = page.url

            let {
                contentLocator,
                contentMetadata,
            } = await storageUtils.findContentMetadata(normalizedUrl)
            const updates = {
                canonicalUrl: page.canonicalUrl ?? page.fullUrl,
                title: page.fullTitle,
                lang: page.lang ?? null,
                description: page.description ?? null,
            }

            if (!contentLocator) {
                contentMetadata = await storageUtils.create(
                    'personalContentMetadata',
                    updates,
                )
                contentLocator = await storageUtils.create(
                    'personalContentLocator',
                    {
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
                    },
                )
            } else if (contentMetadata) {
                await storageUtils.updateById(
                    'personalContentMetadata',
                    contentMetadata.id,
                    updates,
                )
            }
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const normalizedUrl = update.where.url as string
            const firstConttentLocator = await storageUtils.findFirstContentLocator(
                normalizedUrl,
            )
            if (!firstConttentLocator) {
                return
            }
            const allContentLocators: Array<
                PersonalContentLocator & {
                    id: number | string
                }
            > = await storageUtils.findMany('personalContentLocator', {
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
            await storageUtils.deleteMany([
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
            const { contentMetadata } = await storageUtils.findContentMetadata(
                normalizedUrl,
            )
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

            const existingAnnotation = await storageUtils.findOne(
                'personalAnnotation',
                {
                    localId: updates.localId,
                    personalContentMetadata: updates.personalContentMetadata,
                },
            )
            if (!existingAnnotation) {
                const remoteAnnotation = await storageUtils.create(
                    'personalAnnotation',
                    updates,
                )
                if (annotation.selector != null) {
                    await storageUtils.create('personalAnnotationSelector', {
                        selector: annotation.selector,
                        personalAnnotation: remoteAnnotation.id,
                    })
                }
            } else {
                await storageUtils.updateById(
                    'personalAnnotation',
                    existingAnnotation.id,
                    updates,
                )
            }
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const annotationUrl = update.where.url as string
            const localId = extractIdFromAnnotationUrl(annotationUrl)
            const annotation = await storageUtils.findOne(
                'personalAnnotation',
                { localId },
            )
            if (!annotation) {
                return
            }
            const selector = await storageUtils.findOne(
                'personalAnnotationSelector',
                {
                    personalAnnotation: annotation.id,
                },
            )

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

            await storageUtils.deleteMany(toDelete)
        }
    } else if (update.collection === 'annotationPrivacyLevels') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const annotationPrivacyLevel = update.object
            const localId = extractIdFromAnnotationUrl(
                annotationPrivacyLevel.annotation,
            )
            const annotation = await storageUtils.findOne(
                'personalAnnotation',
                { localId },
            )
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

            const existing = await storageUtils.findOne(
                'personalAnnotationPrivacyLevel',
                {
                    personalAnnotation: annotation.id,
                },
            )
            if (existing) {
                await storageUtils.updateById(
                    'personalAnnotationPrivacyLevel',
                    existing.id,
                    updates,
                )
            } else {
                await storageUtils.create(
                    'personalAnnotationPrivacyLevel',
                    updates,
                )
            }
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const localId = update.where.id as string
            const existing = await storageUtils.findOne(
                'personalAnnotationPrivacyLevel',
                {
                    localId,
                },
            )

            await storageUtils.deleteById(
                'personalAnnotationPrivacyLevel',
                existing.id,
                {
                    id: localId,
                },
            )
        }
    } else if (update.collection === 'sharedAnnotationMetadata') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const annotationUrl = update.object.localId as string
            const localAnnotationId = extractIdFromAnnotationUrl(annotationUrl)

            const annotation = await storageUtils.findOne(
                'personalAnnotation',
                {
                    localId: localAnnotationId,
                },
            )
            if (!annotation) {
                return
            }
            const existing = await storageUtils.findOne(
                'personalAnnotationShare',
                {
                    personalAnnotation: annotation.id,
                },
            )

            const updates = {
                excludeFromLists: !!update.object.excludeFromLists,
                personalAnnotation: annotation.id,
                remoteId: update.object.remoteId,
            }

            if (existing) {
                await storageUtils.updateById(
                    'personalAnnotationShare',
                    existing.id,
                    updates,
                )
            } else {
                await storageUtils.create('personalAnnotationShare', updates)
            }
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const annotationUrl = update.where.localId as string
            const localAnnotationId = extractIdFromAnnotationUrl(annotationUrl)

            const annotation = await storageUtils.findOne(
                'personalAnnotation',
                {
                    localId: localAnnotationId,
                },
            )
            if (!annotation) {
                return
            }
            const existing = await storageUtils.findOne(
                'personalAnnotationShare',
                {
                    personalAnnotation: annotation.id,
                },
            )
            if (!existing) {
                return
            }
            await storageUtils.deleteById(
                'personalAnnotationShare',
                existing.id,
                {
                    localId: annotationUrl,
                },
            )
        }
    } else if (update.collection === 'bookmarks') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const bookmark = update.object
            const normalizedUrl = bookmark.url
            const { contentMetadata } = await storageUtils.findContentMetadata(
                normalizedUrl,
            )
            if (!contentMetadata) {
                return
            }
            await storageUtils.findOrCreate(
                'personalBookmark',
                { personalContentMetadata: contentMetadata.id },
                {
                    personalContentMetadata: contentMetadata.id,
                    createdWhen: bookmark.time,
                },
            )
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const normalizedUrl = update.where.url as string
            const { contentMetadata } = await storageUtils.findContentMetadata(
                normalizedUrl,
            )
            if (!contentMetadata) {
                return
            }
            const existing = await storageUtils.findOne('personalBookmark', {
                personalContentMetadata: contentMetadata.id,
            })
            if (!existing) {
                return
            }
            await storageUtils.deleteById('personalBookmark', existing.id, {
                url: normalizedUrl,
            })
        }
    } else if (update.collection === 'visits') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const visit = update.object
            const normalizedUrl = visit.url
            const {
                contentMetadata,
                contentLocator,
            } = await storageUtils.findContentMetadata(normalizedUrl)
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
            const contentRead = await storageUtils.findOne(
                'personalContentRead',
                {
                    readWhen: visit.time,
                    personalContentMetadata: contentMetadata.id,
                },
            )
            if (!contentRead) {
                await storageUtils.create('personalContentRead', updates)
            } else {
                await storageUtils.updateById(
                    'personalContentRead',
                    contentRead.id,
                    updates,
                )
            }
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const time = update.where.time
            const normalizedUrl = update.where.url as string

            const { contentMetadata } = await storageUtils.findContentMetadata(
                normalizedUrl,
            )
            if (!contentMetadata) {
                return
            }

            const contentRead = await storageUtils.findOne(
                'personalContentRead',
                {
                    readWhen: time,
                    personalContentMetadata: contentMetadata.id,
                },
            )
            if (!contentRead) {
                return
            }

            await storageUtils.deleteById(
                'personalContentRead',
                contentRead.id,
                update.where,
            )
        }
    } else if (update.collection === 'tags') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const tagName = update.object.name
            const normalizedUrl = update.object.url

            const {
                objectId,
                collection,
            } = await storageUtils.findTagAssociatedData(normalizedUrl)
            if (!objectId) {
                return
            }

            const tag = await storageUtils.findOrCreate('personalTag', {
                name: tagName,
            })
            await storageUtils.findOrCreate('personalTagConnection', {
                personalTag: tag.id,
                collection,
                objectId,
            })
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const tagName = update.where.name
            const normalizedUrl = update.where.url as string

            const tag = await storageUtils.findOne('personalTag', {
                name: tagName,
            })
            if (!tag) {
                return
            }

            const {
                objectId,
                collection,
            } = await storageUtils.findTagAssociatedData(normalizedUrl)
            if (!objectId) {
                return
            }

            const tagConnection = await storageUtils.findOne(
                'personalTagConnection',
                {
                    personalTag: tag.id,
                    collection,
                    objectId,
                },
            )
            await storageUtils.deleteById(
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

            const existing = await storageUtils.findOne('personalList', {
                localId: localList.id,
            })
            if (existing) {
                await storageUtils.updateById(
                    'personalList',
                    existing.id,
                    updates,
                )
            } else {
                await storageUtils.create('personalList', updates)
            }
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const localId = update.where.id
            const existing = await storageUtils.findOne('personalList', {
                localId,
            })

            await storageUtils.deleteById('personalList', existing.id, {
                id: localId,
            })
        }
    } else if (update.collection === 'pageListEntries') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const localListEntry = update.object
            const normalizedPageUrl = localListEntry.pageUrl

            const [{ contentMetadata }, list] = await Promise.all([
                storageUtils.findContentMetadata(normalizedPageUrl),
                storageUtils.findOne('personalList', {
                    localId: localListEntry.listId,
                }),
            ])
            if (!contentMetadata || !list) {
                return
            }

            await storageUtils.findOrCreate('personalListEntry', {
                personalContentMetadata: contentMetadata.id,
                personalList: list.id,
                createdWhen: localListEntry.createdAt.getTime(),
            })
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const normalizedPageUrl = update.where.pageUrl as string
            const localListId = update.where.listId

            const [{ contentMetadata }, list] = await Promise.all([
                storageUtils.findContentMetadata(normalizedPageUrl),
                storageUtils.findOne('personalList', { localId: localListId }),
            ])
            const existing = await storageUtils.findOne('personalListEntry', {
                personalContentMetadata: contentMetadata.id,
                personalList: list.id,
            })

            if (!existing) {
                return
            }

            await storageUtils.deleteById('personalListEntry', existing.id, {
                pageUrl: normalizedPageUrl,
                listId: localListId,
            })
        }
    } else if (update.collection === 'sharedListMetadata') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const localListId = update.object.localId as string

            const list = await storageUtils.findOne('personalList', {
                localId: localListId,
            })
            if (!list) {
                return
            }
            await storageUtils.findOrCreate(
                'personalListShare',
                { personalList: list.id },
                {
                    personalList: list.id,
                    remoteId: update.object.remoteId,
                },
            )
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const localListId = update.where.localId as string

            const list = await storageUtils.findOne('personalList', {
                localId: localListId,
            })
            if (!list) {
                return
            }
            const existing = await storageUtils.findOne('personalListShare', {
                personalList: list.id,
            })
            if (!existing) {
                return
            }

            await storageUtils.deleteById('personalListShare', existing.id, {
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

            const existing = await storageUtils.findOne(
                'personalTextTemplate',
                { localId },
            )
            if (existing) {
                await storageUtils.updateById(
                    'personalTextTemplate',
                    existing.id,
                    updates,
                )
            } else {
                await storageUtils.create('personalTextTemplate', updates)
            }
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const localId = update.where.id
            const existing = await storageUtils.findOne(
                'personalTextTemplate',
                { localId },
            )

            await storageUtils.deleteById('personalTextTemplate', existing.id, {
                id: localId,
            })
        }
    }
}
