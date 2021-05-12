import mapValues from 'lodash/mapValues'
import { StorageModuleCollections } from "@worldbrain/storex-pattern-modules";
import { STORAGE_VERSIONS } from "../../web-interface/storage/versions";

export const PERSONAL_CLOUD_STORAGE_COLLECTIONS = (): StorageModuleCollections => x({
    ...PERSONAL_CLIENT_COLLECTIONS(),
    ...PERSONAL_ANNOTATION_COLLECTIONS(),
    ...PERSONAL_EXPORT_COLLECTIONS(),
    ...PERSONAL_SHARING_COLLECTIONS(),
    ...PERSONAL_LIST_COLLECTIONS(),
    ...PERSONAL_PAGE_COLLECTIONS(),
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
            { childOf: 'personalClientInfo', alias: 'createdByClient' },
        ],
        groupBy: [
            { subcollectionName: 'objects', key: 'user' },
            ...(collectionDefinition.groupBy ?? [])
        ]
    }))
}

export const PERSONAL_CLIENT_COLLECTIONS = (): StorageModuleCollections => addCommonalities({
    personalClientInfo: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
            name: { type: 'string' }
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
            personalId: { type: 'string' },
            sharedId: { type: 'string' },
        },
    },
    personalAnnotationShare: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
            personalId: { type: 'string' },
            sharedId: { type: 'string' },
            excludeFromLists: { type: 'boolean', optional: true },
        },
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
export const PERSONAL_PAGE_COLLECTIONS = (): StorageModuleCollections => addCommonalities({
    personalPageInfo: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
            normalizedUrl: { type: 'string' },
            originalUrl: { type: 'text' },
            domain: { type: 'string' },
            hostname: { type: 'string' },
            fullTitle: { type: 'text', optional: true },
            lang: { type: 'string', optional: true },
            canonicalUrl: { type: 'string', optional: true },
        },
    },
    personalBookmark: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
            normalizedPageUrl: { type: 'string' },
        },
        relationships: [
            { singleChildOf: 'personalPageInfo' }
        ]
    },
    personalVisit: {
        version: STORAGE_VERSIONS[8].date,
        fields: {
            normalizedPageUrl: { type: 'string' },
            duration: { type: 'int', optional: true },
            scrollMaxPerc: { type: 'float', optional: true },
            scrollMaxPx: { type: 'float', optional: true },
            scrollPerc: { type: 'float', optional: true },
            scrollPx: { type: 'float', optional: true },
        },
        relationships: [
            { childOf: 'personalPageInfo' }
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
            { childOf: 'personalAnnotation' }
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
