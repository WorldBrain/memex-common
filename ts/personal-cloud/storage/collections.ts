import mapValues from 'lodash/mapValues'
import { CollectionFields } from '@worldbrain/storex/lib/types/collections'
import { Relationships } from '@worldbrain/storex/lib/types/relationships'
import { StorageModuleCollections } from '@worldbrain/storex-pattern-modules'
import { STORAGE_VERSIONS } from '../../web-interface/storage/versions'

export const PERSONAL_CLOUD_STORAGE_COLLECTIONS = (): StorageModuleCollections => ({
    ...PERSONAL_META_COLLECTIONS(),
    ...PERSONAL_ANNOTATION_COLLECTIONS(),
    ...PERSONAL_EXPORT_COLLECTIONS(),
    ...PERSONAL_SHARING_COLLECTIONS(),
    ...PERSONAL_LIST_COLLECTIONS(),
    ...PERSONAL_CONTENT_COLLECTIONS(),
    ...PERSONAL_TAG_COLLECTIONS(),
})

function addCommonalities(
    collections: StorageModuleCollections,
    options?: {
        excludeCreationDevice?: boolean
        excludeUpdatedTimestamp?: boolean
    },
): StorageModuleCollections {
    return mapValues(collections, (collectionDefinition) => {
        const fields: CollectionFields = {
            ...collectionDefinition.fields,
            createdWhen: { type: 'timestamp' },
        }
        if (!options?.excludeUpdatedTimestamp) {
            fields.updatedWhen = { type: 'timestamp' }
        }
        const relationships: Relationships = [
            ...(collectionDefinition.relationships ?? []),
            { childOf: 'user' },
        ]
        if (!options?.excludeCreationDevice) {
            relationships.push({
                childOf: 'personalDeviceInfo',
                alias: 'createdByDevice',
            })
        }

        const collections: StorageModuleCollections['collections'] = {
            ...collectionDefinition,
            fields: fields,
            relationships,
            groupBy: [
                { subcollectionName: 'objects', key: 'user' },
                ...(collectionDefinition.groupBy ?? []),
            ],
        }
        return collections
    })
}

export const PERSONAL_META_COLLECTIONS = (): StorageModuleCollections => ({
    ...addCommonalities(
        {
            personalDeviceInfo: {
                version: STORAGE_VERSIONS[8].date,
                fields: {
                    type: { type: 'string' },
                    os: { type: 'string' },
                    browser: { type: 'string' },
                    product: { type: 'string' },
                    name: { type: 'string', optional: true },
                },
            },
        },
        { excludeCreationDevice: true },
    ),
    ...addCommonalities(
        {
            personalDataChange: {
                version: STORAGE_VERSIONS[8].date,
                fields: {
                    type: { type: 'string' },
                    collection: { type: 'string' },
                    objectId: { type: 'string' },
                    info: { type: 'json', optional: true },
                },
            },
        },
        { excludeUpdatedTimestamp: true },
    ),
})

export const PERSONAL_SHARING_COLLECTIONS = (): StorageModuleCollections =>
    addCommonalities({
        personalAnnotationPrivacyLevel: {
            version: STORAGE_VERSIONS[8].date,
            fields: {
                localId: { type: 'string' },
                privacyLevel: { type: 'int' },
            },
            relationships: [{ singleChildOf: 'personalAnnotation' }],
        },
        personalAnnotationShare: {
            version: STORAGE_VERSIONS[8].date,
            fields: {
                remoteId: { type: 'string' },
                excludeFromLists: { type: 'boolean' },
            },
            relationships: [{ singleChildOf: 'personalAnnotation' }],
        },
        personalListShare: {
            version: STORAGE_VERSIONS[8].date,
            fields: {
                remoteId: { type: 'string' },
            },
            relationships: [{ singleChildOf: 'personalList' }],
        },
    })
export const PERSONAL_TAG_COLLECTIONS = (): StorageModuleCollections =>
    addCommonalities({
        personalTag: {
            version: STORAGE_VERSIONS[8].date,
            fields: {
                name: { type: 'string' },
            },
        },
        personalTagConnection: {
            version: STORAGE_VERSIONS[8].date,
            fields: {
                collection: { type: 'string' },
                objectId: { type: 'string' },
            },
            relationships: [{ childOf: 'personalTag' }],
        },
    })
export const PERSONAL_LIST_COLLECTIONS = (): StorageModuleCollections =>
    addCommonalities({
        personalList: {
            version: STORAGE_VERSIONS[8].date,
            fields: {
                name: { type: 'text' },
                localId: { type: 'string' },
                isDeletable: { type: 'boolean' },
                isNestable: { type: 'boolean' },
            },
        },
        personalListDescription: {
            version: STORAGE_VERSIONS[8].date,
            fields: {
                description: { type: 'text' },
            },
            relationships: [{ singleChildOf: 'personalList' }],
        },
        personalListEntry: {
            version: STORAGE_VERSIONS[8].date,
            fields: {},
            relationships: [
                { childOf: 'personalList' },
                { childOf: 'personalContentMetadata' },
            ],
        },
        personalListEntryDescription: {
            version: STORAGE_VERSIONS[8].date,
            fields: {
                description: { type: 'text' },
            },
            relationships: [{ singleChildOf: 'personalListEntry' }],
        },
    })

export const PERSONAL_CONTENT_COLLECTIONS = (): StorageModuleCollections =>
    addCommonalities({
        personalContentMetadata: {
            version: STORAGE_VERSIONS[8].date,
            fields: {
                // NOTE: We don't have a 'type' field for a piece of content, like 'video' or 'audio'
                // instead preferring to deduce that from the formats of the locators attached to it.
                // Display and interaction in the UI will depend more on the formats.

                // This is what we consider the 'home' of the content, which we display regardless
                // of the different ways it might have been accessed (locators).
                canonicalUrl: { type: 'string' },

                title: { type: 'string' },
                lang: { type: 'string', optional: true },
                description: { type: 'string', optional: true },
            },
        },
        personalContentLocator: {
            version: STORAGE_VERSIONS[8].date,
            fields: {
                locationType: { type: 'string' },
                location: { type: 'string' },
                format: { type: 'string' },
                originalLocation: { type: 'string' },
                locationScheme: { type: 'string' },
                primary: { type: 'boolean' },
                valid: { type: 'boolean' },
                version: { type: 'timestamp' },
                fingerprint: { type: 'string', optional: true },
                lastVisited: { type: 'timestamp', optional: true },
                contentSize: { type: 'int', optional: true }, // in bytes
            },
            relationships: [{ childOf: 'personalContentMetadata' }],
        },
        personalContentRead: {
            version: STORAGE_VERSIONS[8].date,
            fields: {
                readWhen: { type: 'timestamp' },
                readDuration: { type: 'int', optional: true },
                scrollMaxPercentage: { type: 'float', optional: true },
                scrollEndPercentage: { type: 'float', optional: true },
                scrollMaxPixel: { type: 'int', optional: true },
                scrollEndPixel: { type: 'int', optional: true },
                pageTotal: { type: 'int', optional: true },
                pageEnd: { type: 'int', optional: true },
                pageMax: { type: 'int', optional: true },
            },
            relationships: [
                { childOf: 'personalContentMetadata' },
                { childOf: 'personalContentLocator' },
            ],
        },
        personalBookmark: {
            version: STORAGE_VERSIONS[8].date,
            fields: {},
            relationships: [{ singleChildOf: 'personalContentMetadata' }],
        },
    })
export const PERSONAL_ANNOTATION_COLLECTIONS = (): StorageModuleCollections =>
    addCommonalities({
        personalAnnotation: {
            version: STORAGE_VERSIONS[8].date,
            fields: {
                localId: { type: 'string' },
                body: { type: 'text', optional: true },
                comment: { type: 'text', optional: true },
            },
            relationships: [{ childOf: 'personalContentMetadata' }],
        },
        personalAnnotationSelector: {
            version: STORAGE_VERSIONS[8].date,
            fields: {
                selector: { type: 'json' },
            },
            relationships: [{ singleChildOf: 'personalAnnotation' }],
        },
    })
export const PERSONAL_EXPORT_COLLECTIONS = (): StorageModuleCollections =>
    addCommonalities({
        personalTextTemplate: {
            version: STORAGE_VERSIONS[8].date,
            fields: {
                localId: { type: 'string' },
                title: { type: 'string' },
                code: { type: 'string' },
                isFavourite: { type: 'boolean' },
            },
        },
    })
