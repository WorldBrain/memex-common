import extractUrlParts from '@worldbrain/memex-url-utils/lib/extract-parts/index'
import { URLParts } from '@worldbrain/memex-url-utils/lib/extract-parts/types'
import {
    PersonalCloudUpdateType,
    PersonalCloudUpdatePush,
    TranslationLayerDependencies,
    PersonalCloudClientInstruction,
    PersonalCloudClientInstructionType,
} from '../../types'
import {
    LocationSchemeType,
    ContentLocatorType,
    ContentLocatorFormat,
} from '../../../storage/types'
import {
    PersonalContentLocator,
    PersonalContentRead,
    PersonalTagConnection,
} from '../../../../web-interface/types/storex-generated/personal-cloud'
import { extractIdFromAnnotationUrl } from '../utils'
import { UploadStorageUtils, DeleteReference } from '../storage-utils'
import { DATE_FIELDS } from './constants'

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
}): Promise<{ clientInstructions: PersonalCloudClientInstruction[] }> {
    const storageUtils = new UploadStorageUtils({ ...params, update })
    const clientInstructions: PersonalCloudClientInstruction[] = []

    preprocessUpdate(update)

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
                title: page.fullTitle?.length > 0 ? page.fullTitle : null,
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
                        version: 0, // TODO: we don't yet have a clear idea of concept of versions here - needs more thought
                        valid: true,
                        primary: true,
                        contentSize: null,
                        fingerprint: null,
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

            if (contentMetadata) {
                const htmlUploadPath = `/u/${params.userId}/htmlBody/${contentMetadata.id}.html`
                clientInstructions.push({
                    type: PersonalCloudClientInstructionType.UploadToStorage,
                    storage: 'persistent',
                    collection: 'pageContent',
                    uploadWhere: { normalizedUrl },
                    uploadField: 'htmlBody',
                    uploadPath: htmlUploadPath,
                    changeInfo: {
                        type: 'htmlBody',
                        normalizedUrl,
                    },
                })

                let urlParts: URLParts
                try {
                    urlParts = extractUrlParts(page.fullUrl, { suppressParseErrors: false })
                } catch (e) {
                    console.error(e)
                    return { clientInstructions }
                }
                const { hostname } = urlParts
                const favIconUploadPath = `/u/${params.userId}/favIcon/${hostname}`
                clientInstructions.push({
                    type: PersonalCloudClientInstructionType.UploadToStorage,
                    storage: 'normal',
                    collection: 'favIcons',
                    uploadWhere: { hostname },
                    uploadField: 'favIcon',
                    uploadPath: favIconUploadPath,
                    changeInfo: {
                        type: 'favIcon',
                        hostname,
                    },
                })
            }
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const normalizedUrl = update.where.url as string
            const firstConttentLocator = await storageUtils.findFirstContentLocator(
                normalizedUrl,
            )
            if (!firstConttentLocator) {
                return { clientInstructions }
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

            await storageUtils.deleteMany([
                {
                    collection: 'personalContentMetadata',
                    id: firstConttentLocator.personalContentMetadata,
                    changeInfo: normalizedContentLocator
                        ? { normalizedUrl: normalizedContentLocator.location }
                        : null,
                },
                ...allContentLocators.map((locator) => ({
                    collection: 'personalContentLocator',
                    id: locator.id,
                })),
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
                return { clientInstructions }
            }
            const updates = {
                personalContentMetadata: contentMetadata.id,
                localId: extractIdFromAnnotationUrl(annotation.url),
                body: annotation.body ?? null,
                comment: annotation.comment ?? null,
                createdWhen: annotation.createdWhen.getTime(),
                updatedWhen: annotation.lastEdited?.getTime() ?? null,
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
                return { clientInstructions }
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
                return { clientInstructions }
            }

            const updates = {
                personalAnnotation: annotation.id,
                localId: annotationPrivacyLevel.id,
                privacyLevel: annotationPrivacyLevel.privacyLevel,
                createdWhen: annotationPrivacyLevel.createdWhen.getTime(),
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
            const metadata = update.object
            const localAnnotationId = extractIdFromAnnotationUrl(
                metadata.localId,
            )

            const annotation = await storageUtils.findOne(
                'personalAnnotation',
                {
                    localId: localAnnotationId,
                },
            )
            if (!annotation) {
                return { clientInstructions }
            }
            const existing = await storageUtils.findOne(
                'personalAnnotationShare',
                {
                    personalAnnotation: annotation.id,
                },
            )

            const updates = {
                excludeFromLists: !!metadata.excludeFromLists ?? false,
                personalAnnotation: annotation.id,
                remoteId: metadata.remoteId,
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
                return { clientInstructions }
            }
            const existing = await storageUtils.findOne(
                'personalAnnotationShare',
                {
                    personalAnnotation: annotation.id,
                },
            )
            if (!existing) {
                return { clientInstructions }
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
                return { clientInstructions }
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
                return { clientInstructions }
            }
            const existing = await storageUtils.findOne('personalBookmark', {
                personalContentMetadata: contentMetadata.id,
            })
            if (!existing) {
                return { clientInstructions }
            }
            await storageUtils.deleteById('personalBookmark', existing.id, {
                url: normalizedUrl,
            })
        }
    } else if (update.collection === 'visits') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const visit = update.object
            const {
                contentMetadata,
                contentLocator,
            } = await storageUtils.findContentMetadata(visit.url)
            if (!contentMetadata) {
                return { clientInstructions }
            }
            const updates = {
                personalContentMetadata: contentMetadata.id,
                personalContentLocator: contentLocator.id,
                readWhen: visit.time,
                readDuration: visit.duration ?? null,
                scrollEndPercentage: visit.scrollPerc ?? null,
                scrollMaxPercentage: visit.scrollMaxPerc ?? null,
                scrollMaxPixel: visit.scrollMaxPx ?? null,
                scrollEndPixel: visit.scrollPx ?? null,
                pageTotal: null,
                pageEnd: null,
                pageMax: null,
            }
            const contentRead = await storageUtils.findOne(
                'personalContentRead',
                {
                    readWhen: visit.time,
                    personalContentMetadata: contentMetadata.id,
                },
            )
            if (!contentRead) {
                await storageUtils.updateById(
                    'personalContentLocator',
                    contentLocator.id,
                    { lastVisited: updates.readWhen },
                )
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

            const {
                contentMetadata,
                contentLocator,
            } = await storageUtils.findContentMetadata(normalizedUrl)
            if (!contentMetadata) {
                return { clientInstructions }
            }

            const contentReads = await storageUtils.findMany<
                PersonalContentRead & { id: string | number }
            >(
                'personalContentRead',
                {
                    personalContentMetadata: contentMetadata.id,
                },
                { limit: 2 },
            )
            if (!contentReads.length) {
                return { clientInstructions }
            }

            const [latestRead, secondLatestRead] = contentReads.sort(
                (a, b) => b.readWhen - a.readWhen,
            )
            if (!latestRead) {
                return { clientInstructions }
            }

            await storageUtils.updateById(
                'personalContentLocator',
                contentLocator.id,
                { lastVisited: secondLatestRead?.readWhen ?? 0 },
            )
            await storageUtils.deleteById(
                'personalContentRead',
                latestRead.id,
                {
                    time,
                    url: normalizedUrl,
                },
            )
        }
    } else if (update.collection === 'tags') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const tag = update.object

            const {
                objectId,
                collection,
            } = await storageUtils.findTagAssociatedData(tag.url)
            if (!objectId) {
                return { clientInstructions }
            }

            const storedTag = await storageUtils.findOrCreate('personalTag', {
                name: tag.name,
            })
            await storageUtils.findOrCreate('personalTagConnection', {
                personalTag: storedTag.id,
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
                return { clientInstructions }
            }

            const {
                objectId,
                collection,
            } = await storageUtils.findTagAssociatedData(normalizedUrl)
            if (!objectId) {
                return { clientInstructions }
            }

            const [tagConnection, otherConnections] = await Promise.all([
                storageUtils.findOne<
                    PersonalTagConnection & { id: string | number }
                >('personalTagConnection', {
                    personalTag: tag.id,
                    collection,
                    objectId,
                }),
                storageUtils.findMany<PersonalTagConnection>(
                    'personalTagConnection',
                    { personalTag: tag.id },
                    { limit: 2 },
                ),
            ])

            await storageUtils.deleteById(
                'personalTagConnection',
                tagConnection.id,
                {
                    name: tagName,
                    url: normalizedUrl,
                },
            )

            // Ensure orphaned tags are removed
            // TODO: Remove this when we have a way to explicitly remove tags + update the ext's tag data model
            if (otherConnections.length === 1) {
                await storageUtils.deleteById('personalTag', tag.id)
            }
        }
    } else if (update.collection === 'customLists') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const localList = update.object
            const updates = {
                name: localList.name,
                localId: localList.id,
                isNestable: localList.isNestable ?? false,
                isDeletable: localList.isDeletable ?? false,
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
                return { clientInstructions }
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
                return { clientInstructions }
            }

            await storageUtils.deleteById('personalListEntry', existing.id, {
                pageUrl: normalizedPageUrl,
                listId: localListId,
            })
        }
    } else if (update.collection === 'sharedListMetadata') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const metadata = update.object

            const list = await storageUtils.findOne('personalList', {
                localId: metadata.localId,
            })
            if (!list) {
                return { clientInstructions }
            }
            await storageUtils.findOrCreate(
                'personalListShare',
                { personalList: list.id },
                {
                    personalList: list.id,
                    remoteId: metadata.remoteId,
                },
            )
        } else if (update.type === PersonalCloudUpdateType.Delete) {
            const localListId = update.where.localId as string

            const list = await storageUtils.findOne('personalList', {
                localId: localListId,
            })
            if (!list) {
                return { clientInstructions }
            }
            const existing = await storageUtils.findOne('personalListShare', {
                personalList: list.id,
            })
            if (!existing) {
                return { clientInstructions }
            }

            await storageUtils.deleteById('personalListShare', existing.id, {
                localId: localListId,
            })
        }
    } else if (update.collection === 'templates') {
        if (update.type === PersonalCloudUpdateType.Overwrite) {
            const template = update.object
            const updates = {
                isFavourite: template.isFavourite,
                title: template.title,
                localId: template.id,
                code: template.code,
            }

            const existing = await storageUtils.findOne(
                'personalTextTemplate',
                { localId: template.id },
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

    return { clientInstructions }
}

function ensureDateFields(object: any, fields: string[]) {
    for (const field of fields) {
        if (typeof object[field] === 'string') {
            object[field] = new Date(object[field])
        }
    }
}

function preprocessUpdate(update: PersonalCloudUpdatePush) {
    if (update.type !== PersonalCloudUpdateType.Overwrite) {
        return
    }

    const dateFields = DATE_FIELDS[update.collection] ?? []
    ensureDateFields(update.object, dateFields)
}
