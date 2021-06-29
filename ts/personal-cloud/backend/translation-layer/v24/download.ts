import {
    PersonalDataChange,
    PersonalContentLocator,
    PersonalContentMetadata,
    PersonalContentRead,
    PersonalTagConnection,
    PersonalAnnotation,
    PersonalAnnotationSelector,
    PersonalTextTemplate,
    PersonalList,
    PersonalListEntry,
    PersonalAnnotationPrivacyLevel,
    PersonalListShare,
    PersonalAnnotationShare,
    PersonalBookmark,
} from '../../../../web-interface/types/storex-generated/personal-cloud'
import { DataChangeType } from '../../../../personal-cloud/storage/types'
import { DOWNLOAD_CHANGE_BATCH_SIZE } from '../constants'
import {
    TranslationLayerDependencies,
    PersonalCloudUpdateBatch,
    PersonalCloudUpdateType,
    DownloadClientUpdatesReturnType,
} from '../../types'
import {
    constructAnnotationUrl,
    constructPageFromRemote,
    constructAnnotationFromRemote,
} from '../utils'
import { DownloadStorageUtils } from '../storage-utils'

export async function downloadClientUpdatesV24(
    params: TranslationLayerDependencies & {
        startTime: number
    },
): Promise<DownloadClientUpdatesReturnType> {
    const storageUtils = new DownloadStorageUtils(params)

    const changes = await storageUtils.findMany<PersonalDataChange>(
        'personalDataChange',
        {
            createdWhen: { $gt: params.startTime },
        },
        { limit: DOWNLOAD_CHANGE_BATCH_SIZE },
    )

    let lastSeen = params.startTime
    const batch: PersonalCloudUpdateBatch = []
    for (const change of changes) {
        if (
            change.type === DataChangeType.Create ||
            change.type === DataChangeType.Modify
        ) {
            lastSeen = change.createdWhen

            if (change.collection === 'personalContentLocator') {
                continue
            }

            const object = await storageUtils.findOne(change.collection, {
                id: change.objectId,
            })
            if (!object) {
                continue
            }

            if (change.collection === 'personalContentMetadata') {
                const metadata = object as PersonalContentMetadata & {
                    id: string | number
                }
                const locatorArray = (await storageUtils.findMany(
                    'personalContentLocator',
                    {
                        personalContentMetadata: metadata.id,
                    },
                    { limit: 1 },
                )) as PersonalContentLocator[]
                if (!locatorArray.length) {
                    continue
                }
                batch.push({
                    type: PersonalCloudUpdateType.Overwrite,
                    collection: 'pages',
                    object: constructPageFromRemote(metadata, locatorArray[0]),
                })
            } else if (change.collection === 'personalContentRead') {
                const read = object as PersonalContentRead & {
                    personalContentMetadata: number | string
                }
                const locatorArray = (await storageUtils.findMany(
                    'personalContentLocator',
                    {
                        personalContentMetadata: read.personalContentMetadata,
                    },
                    { limit: 1 },
                )) as PersonalContentLocator[]
                batch.push({
                    type: PersonalCloudUpdateType.Overwrite,
                    collection: 'visits',
                    object: {
                        url: locatorArray[0].location,
                        time: read.readWhen,
                        duration: read.readDuration,
                        scrollMaxPx: read.scrollMaxPixel,
                        scrollMaxPerc: read.scrollMaxPercentage,
                        scrollPerc: read.scrollEndPercentage,
                        scrollPx: read.scrollEndPixel,
                    },
                })
            } else if (change.collection === 'personalBookmark') {
                const bookmark = object as PersonalBookmark & {
                    personalContentMetadata: string
                }
                const { locator } = await storageUtils.findLocatorForMetadata(
                    bookmark.personalContentMetadata,
                )
                if (!locator) {
                    continue
                }
                batch.push({
                    type: PersonalCloudUpdateType.Overwrite,
                    collection: 'bookmarks',
                    object: {
                        url: locator.location,
                        time: bookmark.createdWhen,
                    },
                })
            } else if (change.collection === 'personalAnnotation') {
                const annotation = object as PersonalAnnotation & {
                    id: string | number
                    personalContentMetadata: number | string
                }
                const {
                    locator,
                    metadata,
                } = await storageUtils.findLocatorForMetadata(
                    annotation.personalContentMetadata,
                )
                if (!locator || !metadata) {
                    continue
                }
                const selector = await storageUtils.findOne<
                    PersonalAnnotationSelector
                >('personalAnnotationSelector', {
                    personalAnnotation: annotation.id,
                })
                batch.push({
                    type: PersonalCloudUpdateType.Overwrite,
                    collection: 'annotations',
                    object: constructAnnotationFromRemote(
                        annotation,
                        metadata,
                        locator,
                        selector,
                    ),
                })
            } else if (change.collection === 'personalAnnotationPrivacyLevel') {
                const annotationPrivacyLevel = object as PersonalAnnotationPrivacyLevel & {
                    personalAnnotation: string
                }
                const annotation = await storageUtils.findOne<
                    PersonalAnnotation & { personalContentMetadata: string }
                >('personalAnnotation', {
                    id: annotationPrivacyLevel.personalAnnotation,
                })
                if (!annotation) {
                    continue
                }
                const { locator } = await storageUtils.findLocatorForMetadata(
                    annotation.personalContentMetadata,
                )
                const annotationUrl =
                    locator != null &&
                    constructAnnotationUrl(locator.location, annotation.localId)
                if (!annotationUrl) {
                    continue
                }
                batch.push({
                    type: PersonalCloudUpdateType.Overwrite,
                    collection: 'annotationPrivacyLevels',
                    object: {
                        annotation: annotationUrl,
                        id: annotationPrivacyLevel.localId,
                        privacyLevel: annotationPrivacyLevel.privacyLevel,
                        createdWhen: new Date(
                            annotationPrivacyLevel.createdWhen,
                        ),
                        updatedWhen: new Date(
                            annotationPrivacyLevel.updatedWhen,
                        ),
                    },
                })
            } else if (change.collection === 'personalAnnotationShare') {
                const annotationShare = object as PersonalAnnotationShare & {
                    personalAnnotation: string
                }
                const annotation = await storageUtils.findOne<
                    PersonalAnnotation & { personalContentMetadata: string }
                >('personalAnnotation', {
                    id: annotationShare.personalAnnotation,
                })
                if (!annotation) {
                    continue
                }
                const { locator } = await storageUtils.findLocatorForMetadata(
                    annotation.personalContentMetadata,
                )
                const annotationUrl =
                    locator != null &&
                    constructAnnotationUrl(locator.location, annotation.localId)
                if (!annotationUrl) {
                    continue
                }
                batch.push({
                    type: PersonalCloudUpdateType.Overwrite,
                    collection: 'sharedAnnotationMetadata',
                    object: {
                        localId: annotationUrl,
                        remoteId: annotationShare.remoteId,
                        excludeFromLists: annotationShare.excludeFromLists,
                    },
                })
            } else if (change.collection === 'personalTagConnection') {
                const tagConnection = object as PersonalTagConnection & {
                    personalTag: number | string
                }

                let tagUrl: string
                if (tagConnection.collection === 'personalContentMetadata') {
                    const {
                        locator,
                    } = await storageUtils.findLocatorForMetadata(
                        tagConnection.objectId,
                    )
                    tagUrl = locator?.location
                } else if (tagConnection.collection === 'personalAnnotation') {
                    const annotation = await storageUtils.findOne<
                        PersonalAnnotation & { personalContentMetadata: string }
                    >(tagConnection.collection, {
                        id: tagConnection.objectId,
                    })

                    const {
                        locator,
                    } = await storageUtils.findLocatorForMetadata(
                        annotation.personalContentMetadata,
                    )
                    tagUrl =
                        locator != null &&
                        constructAnnotationUrl(
                            locator.location,
                            annotation.localId,
                        )
                }
                if (!tagUrl) {
                    continue
                }

                const tag = await storageUtils.findOne('personalTag', {
                    id: tagConnection.personalTag,
                })

                batch.push({
                    type: PersonalCloudUpdateType.Overwrite,
                    collection: 'tags',
                    object: {
                        url: tagUrl,
                        name: tag.name,
                    },
                })
            } else if (change.collection === 'personalList') {
                const list = object as PersonalList
                batch.push({
                    type: PersonalCloudUpdateType.Overwrite,
                    collection: 'customLists',
                    object: {
                        name: list.name,
                        id: list.localId,
                        searchableName: list.name,
                        isNestable: list.isNestable,
                        isDeletable: list.isDeletable,
                        createdAt: new Date(list.createdWhen),
                    },
                })
            } else if (change.collection === 'personalListEntry') {
                const listEntry = object as PersonalListEntry & {
                    personalList: string
                    personalContentMetadata: string
                }
                const [{ locator }, list] = await Promise.all([
                    storageUtils.findLocatorForMetadata(
                        listEntry.personalContentMetadata,
                    ),
                    storageUtils.findOne<PersonalList>('personalList', {
                        id: listEntry.personalList,
                    }),
                ])

                if (!locator || !list) {
                    continue
                }

                batch.push({
                    type: PersonalCloudUpdateType.Overwrite,
                    collection: 'pageListEntries',
                    object: {
                        listId: list.localId,
                        pageUrl: locator.location,
                        fullUrl: locator.originalLocation,
                        createdAt: new Date(listEntry.createdWhen),
                    },
                })
            } else if (change.collection === 'personalListShare') {
                const listShareMetadata = object as PersonalListShare & {
                    personalList: string
                }
                const list = await storageUtils.findOne<PersonalList>(
                    'personalList',
                    {
                        id: listShareMetadata.personalList,
                    },
                )
                if (!list) {
                    continue
                }

                batch.push({
                    type: PersonalCloudUpdateType.Overwrite,
                    collection: 'sharedListMetadata',
                    object: {
                        localId: list.localId,
                        remoteId: listShareMetadata.remoteId,
                    },
                })
            } else if (change.collection === 'personalTextTemplate') {
                const template = object as PersonalTextTemplate
                batch.push({
                    type: PersonalCloudUpdateType.Overwrite,
                    collection: 'templates',
                    object: {
                        id: template.localId,
                        title: template.title,
                        code: template.code,
                        isFavourite: template.isFavourite,
                    },
                })
            }
        } else if (change.type === DataChangeType.Delete) {
            if (change.collection === 'personalContentMetadata') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'pages',
                    where: { url: change.info?.normalizedUrl },
                })
            } else if (change.collection === 'personalContentRead') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'visits',
                    where: {
                        url: change.info.url,
                        time: change.info.time,
                    },
                })
            } else if (change.collection === 'personalBookmark') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'bookmarks',
                    where: {
                        url: change.info.url,
                    },
                })
            } else if (change.collection === 'personalAnnotation') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'annotations',
                    where: {
                        url: change.info.url,
                    },
                })
            } else if (change.collection === 'personalAnnotationPrivacyLevel') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'annotationPrivacyLevels',
                    where: { id: change.info.id },
                })
            } else if (change.collection === 'personalAnnotationShare') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'sharedAnnotationMetadata',
                    where: { localId: change.info.localId },
                })
            } else if (change.collection === 'personalTagConnection') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'tags',
                    where: { url: change.info.url, name: change.info.name },
                })
            } else if (change.collection === 'personalList') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'customLists',
                    where: { id: change.info.id },
                })
            } else if (change.collection === 'personalListEntry') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'pageListEntries',
                    where: {
                        listId: change.info.listId,
                        pageUrl: change.info.pageUrl,
                    },
                })
            } else if (change.collection === 'personalListShare') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'sharedListMetadata',
                    where: { localId: change.info.localId },
                })
            } else if (change.collection === 'personalTextTemplate') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'templates',
                    where: { id: change.info.id },
                })
            }
        }
    }

    return {
        batch,
        lastSeen,
        maybeHasMore: changes.length === DOWNLOAD_CHANGE_BATCH_SIZE,
    }
}
