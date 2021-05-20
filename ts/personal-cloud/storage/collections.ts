import mapValues from 'lodash/mapValues'
import { StorageModuleCollections } from "@worldbrain/storex-pattern-modules";
import { STORAGE_VERSIONS } from "../../web-interface/storage/versions";

export const PERSONAL_CLOUD_STORAGE_COLLECTIONS = (): StorageModuleCollections => ({
    ...PERSONAL_DEVICE_COLLECTIONS(),
    ...PERSONAL_ANNOTATION_COLLECTIONS(),
    ...PERSONAL_EXPORT_COLLECTIONS(),
    ...PERSONAL_SHARING_COLLECTIONS(),
    ...PERSONAL_LIST_COLLECTIONS(),
    ...PERSONAL_CONTENT_COLLECTIONS(),
    ...PERSONAL_TAG_COLLECTIONS(),
})

function addCommonalities(collections: StorageModuleCollections): StorageModuleCollections {
    return mapValues(collections, (collectionDefinition): StorageModuleCollections['collections'] => ({
        ...collectionDefinition,
        fields: {
            ...collectionDefinition.fields,
            createdWhen: { type: 'timestamp' },
            updatedWhen: { type: 'timestamp' },
        },
        relationships: [
            ...(collectionDefinition.relationships ?? []),
            { childOf: 'user' },
            { childOf: 'personalDeviceInfo', alias: 'createdByDevice' },
        ],
        groupBy: [
            { subcollectionName: 'objects', key: 'user' },
            ...(collectionDefinition.groupBy ?? [])
        ]
    }))
}

export const PERSONAL_DEVICE_COLLECTIONS = (): StorageModuleCollections => addCommonalities({
    personalDeviceInfo: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
            type: { type: 'string' },
            os: { type: 'string' },
            browser: { type: 'string' },
            product: { type: 'string' },
            name: { type: 'string', optional: true },
        },
    }
})

export const PERSONAL_SHARING_COLLECTIONS = (): StorageModuleCollections => addCommonalities({
    personalAnnotationPrivacyLevel: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
            privacyLevel: { type: 'int' },
        },
        relationships: [
            { childOf: 'personalAnnotation' }
        ]
    },
    personalListShare: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
        },
        relationships: [
            { singleChildOf: 'personalAnnotation' },
            { singleChildOf: 'sharedAnnotation' },
        ]
    },
    personalAnnotationShare: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
            excludeFromLists: { type: 'boolean', optional: true },
        },
        relationships: [
            { singleChildOf: 'personalAnnotation' },
            { singleChildOf: 'sharedAnnotation' },
        ]
    },
})
export const PERSONAL_TAG_COLLECTIONS = (): StorageModuleCollections => addCommonalities({
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
    },
})
export const PERSONAL_LIST_COLLECTIONS = (): StorageModuleCollections => addCommonalities({
    personalList: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
            name: { type: 'string' },
            isDeletable: { type: 'boolean', optional: true },
            isNestable: { type: 'boolean', optional: true },
        },
    },
    personalListDescription: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
            description: { type: 'text' },
        },
        relationships: [
            { childOf: 'personalList' }
        ]
    },
    personalPageEntry: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
            normalizedPageUrl: { type: 'string' },
            originalPageUrl: { type: 'string' },
            title: { type: 'string', optional: true },
        },
        relationships: [
            { childOf: 'personalList' }
        ]
    },
    personalPageEntryDescription: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
        },
        relationships: [
            { childOf: 'personalPageEntry' }
        ]
    },
})

export const PERSONAL_CONTENT_COLLECTIONS = (): StorageModuleCollections => addCommonalities({
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
        },
    },
    personalContentLocator: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
            locationType: { type: 'string' },
            format: { type: 'string' },
            originalLocation: { type: 'string' },
            locationScheme: { type: 'string' },
            location: { type: 'string' },
            fingerprint: { type: 'string' },
            primary: { type: 'boolean' },
            valid: { type: 'boolean' },
            version: { type: 'timestamp' },
            lastVisited: { type: 'timestamp', optional: true },
            contentSize: { type: 'int', optional: true }, // in bytes
        },
        relationships: [
            { childOf: 'personalContentMetadata' },
        ]
    },
    personalContentRead: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
            // progress is the units of the total, like 400px of 1200px total

            readWhen: { type: 'timestamp' },
            readDuration: { type: 'int', optional: true },
            progressPercentage: { type: 'float', optional: true },
            scrollTotal: { type: 'int', optional: true },
            scrollProgress: { type: 'int', optional: true },
            pageTotal: { type: 'int', optional: true },
            pageProgress: { type: 'int', optional: true },
            durationTotal: { type: 'int', optional: true },
            durationProgress: { type: 'int', optional: true },
        },
        relationships: [
            { childOf: 'personalContentMetadata' },
            { childOf: 'personalContentLocator' },
        ]
    },
    personalBookmark: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
            normalizedPageUrl: { type: 'string' },
        },
        relationships: [
            { singleChildOf: 'personalContentMetadata' }
        ]
    },

})
export const PERSONAL_ANNOTATION_COLLECTIONS = (): StorageModuleCollections => addCommonalities({
    personalAnnotation: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
            normalizedPageUrl: { type: 'string' },
            body: { type: 'text', optional: true },
            comment: { type: 'text', optional: true },
        },
    },
    personalAnnotationSelector: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
            selector: { type: 'json' },
        },
        relationships: [
            { singleChildOf: 'personalAnnotation' }
        ]
    },
})
export const PERSONAL_EXPORT_COLLECTIONS = (): StorageModuleCollections => addCommonalities({
    personalTextTemplate: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
            title: { type: 'string' },
            code: { type: 'string' },
            isFavourite: { type: 'boolean' },
        },
    },
})
