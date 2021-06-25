import { FindManyOptions } from '@worldbrain/storex'
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
} from '../../../../web-interface/types/storex-generated/personal-cloud'
import {
    DataChangeType,
    LocationSchemeType,
} from '../../../../personal-cloud/storage/types'
import { DOWNLOAD_CHANGE_BATCH_SIZE } from '../constants'
import {
    TranslationLayerDependencies,
    PersonalCloudUpdateBatch,
    PersonalCloudUpdateType,
} from '../../types'
import {
    constructAnnotationUrl,
    constructPageFromRemote,
    constructAnnotationFromRemote,
} from '../utils'

export async function downloadClientUpdatesV24(
    params: TranslationLayerDependencies & {
        startTime: number
    },
) {
    const { storageManager } = params
    const findOne = async <T = any>(
        collection: string,
        where: any,
    ): Promise<T> => {
        return storageManager
            .collection(collection)
            .findObject({ ...where, user: params.userId }) as any
    }
    const findMany = async <T = any>(
        collection: string,
        where: any,
        options?: FindManyOptions,
    ): Promise<T[]> => {
        return params.storageManager.collection(collection).findObjects(
            {
                ...where,
                user: params.userId,
            },
            options,
        )
    }

    const findLocatorForMetadata = async (
        metadataId: string | number,
        locationScheme = LocationSchemeType.NormalizedUrlV1,
    ): Promise<{
        metadata?: PersonalContentMetadata
        locator?: PersonalContentLocator
    }> => {
        const metadata = await findOne<
            PersonalContentMetadata & { id: string | number }
        >('personalContentMetadata', { id: metadataId })
        if (!metadata) {
            return {}
        }
        const allContentLocators = await findMany<PersonalContentLocator>(
            'personalContentLocator',
            {
                personalContentMetadata: metadata.id,
            },
        )
        const locator = allContentLocators.find(
            (locator) => locator.locationScheme === locationScheme,
        )
        return { metadata, locator }
    }

    const changes = (await findMany(
        'personalDataChange',
        {
            createdWhen: { $gt: params.startTime },
        },
        { limit: DOWNLOAD_CHANGE_BATCH_SIZE },
    )) as PersonalDataChange[]

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

            const object = await findOne(change.collection, {
                id: change.objectId,
            })
            if (!object) {
                continue
            }

            if (change.collection === 'personalContentMetadata') {
                const metadata = object as PersonalContentMetadata & {
                    id: string | number
                }
                const locatorArray = (await findMany(
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
                const locatorArray = (await findMany(
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
                        scrollMaxPerc: 100,
                        scrollMaxPx: read.scrollTotal,
                        scrollPerc:
                            typeof read.scrollProgress === 'number' &&
                            typeof read.scrollTotal === 'number'
                                ? (read.scrollProgress / read.scrollTotal) * 100
                                : undefined,
                        scrollPx: read.scrollProgress,
                    },
                })
            } else if (change.collection === 'personalAnnotation') {
                const annotation = object as PersonalAnnotation & {
                    id: string | number
                    personalContentMetadata: number | string
                }
                const { locator, metadata } = await findLocatorForMetadata(
                    annotation.personalContentMetadata,
                )
                if (!locator || !metadata) {
                    continue
                }
                const selector = await findOne<PersonalAnnotationSelector>(
                    'personalAnnotationSelector',
                    {
                        personalAnnotation: annotation.id,
                    },
                )
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
                const annotation = await findOne<
                    PersonalAnnotation & { personalContentMetadata: string }
                >('personalAnnotation', {
                    id: annotationPrivacyLevel.personalAnnotation,
                })
                if (!annotation) {
                    continue
                }
                const { locator } = await findLocatorForMetadata(
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
                const annotation = await findOne<
                    PersonalAnnotation & { personalContentMetadata: string }
                >('personalAnnotation', {
                    id: annotationShare.personalAnnotation,
                })
                if (!annotation) {
                    continue
                }
                const { locator } = await findLocatorForMetadata(
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
                    const { locator } = await findLocatorForMetadata(
                        tagConnection.objectId,
                    )
                    tagUrl = locator?.location
                } else if (tagConnection.collection === 'personalAnnotation') {
                    const annotation = await findOne<
                        PersonalAnnotation & { personalContentMetadata: string }
                    >(tagConnection.collection, {
                        id: tagConnection.objectId,
                    })

                    const { locator } = await findLocatorForMetadata(
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

                const tag = await findOne('personalTag', {
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
                    findLocatorForMetadata(listEntry.personalContentMetadata),
                    findOne<PersonalList>('personalList', {
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
                const list = await findOne<PersonalList>('personalList', {
                    id: listShareMetadata.personalList,
                })
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
                // TODO: Update all these to explicitly refer to the fields that are being used from change.info (safer)
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'visits',
                    where: change.info,
                })
            } else if (change.collection === 'personalAnnotation') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'annotations',
                    where: change.info,
                })
            } else if (change.collection === 'personalAnnotationPrivacyLevel') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'annotationPrivacyLevels',
                    where: change.info,
                })
            } else if (change.collection === 'personalAnnotationShare') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'sharedAnnotationMetadata',
                    where: change.info,
                })
            } else if (change.collection === 'personalTagConnection') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'tags',
                    where: change.info,
                })
            } else if (change.collection === 'personalList') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'customLists',
                    where: change.info,
                })
            } else if (change.collection === 'personalListEntry') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'pageListEntries',
                    where: change.info,
                })
            } else if (change.collection === 'personalListShare') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'sharedListMetadata',
                    where: change.info,
                })
            } else if (change.collection === 'personalTextTemplate') {
                batch.push({
                    type: PersonalCloudUpdateType.Delete,
                    collection: 'templates',
                    where: change.info,
                })
            }
        }
    }

    const result = {
        batch,
        lastSeen,
        maybeHasMore: changes.length === DOWNLOAD_CHANGE_BATCH_SIZE,
    }
    return result
}
