import { StorageModuleCollections } from "@worldbrain/storex-pattern-modules";
import { STORAGE_VERSIONS } from "../../web-interface/storage/versions";

export const CONTENT_SHARING_STORAGE_COLLECTIONS = (): StorageModuleCollections => ({
    sharedList: {
        version: STORAGE_VERSIONS[0].date,
        fields: {
            createdWhen: { type: 'timestamp' },
            updatedWhen: { type: 'timestamp' },
            title: { type: 'string' },
            description: { type: 'string', optional: true },
        },
        relationships: [
            { alias: 'creator', childOf: 'user' }
        ]
    },
    sharedListCreatorInfo: {
        version: STORAGE_VERSIONS[0].date,
        fields: {
            localListId: { type: 'timestamp' },
        },
        relationships: [
            { childOf: 'sharedList' },
            { alias: 'creator', childOf: 'user' }
        ],
        groupBy: [
            { key: 'creator', subcollectionName: 'lists' }
        ]
    },
    sharedListEntry: {
        version: STORAGE_VERSIONS[0].date,
        fields: {
            createdWhen: { type: 'timestamp' },
            updatedWhen: { type: 'timestamp' },
            entryTitle: { type: 'string', optional: true },
            normalizedUrl: { type: 'string' },
            originalUrl: { type: 'string' },
        },
        relationships: [
            { childOf: 'sharedList' },
            { alias: 'creator', childOf: 'user' }
        ],
    },
    sharedListRole: {
        version: STORAGE_VERSIONS[7].date,
        fields: {
            createdWhen: { type: 'timestamp' },
            updatedWhen: { type: 'timestamp' },
            roleID: { type: 'int' },
        },
        relationships: [
            { childOf: 'sharedList' },
            { childOf: 'user' },
        ],
        groupBy: [
            { subcollectionName: 'users', key: 'sharedList' }
        ],
        indices: [
            { field: { relationship: 'user' }, pk: true }
        ]
    },
    sharedListRoleByUser: {
        version: STORAGE_VERSIONS[7].date,
        fields: {
            createdWhen: { type: 'timestamp' },
            updatedWhen: { type: 'timestamp' },
            roleID: { type: 'int' },
        },
        relationships: [
            { childOf: 'sharedList' },
            { childOf: 'user' },
        ],
        groupBy: [
            { subcollectionName: 'lists', key: 'user' }
        ],
        indices: [
            { field: { relationship: 'sharedList' }, pk: true }
        ]
    },
    sharedListKey: {
        version: STORAGE_VERSIONS[7].date,
        fields: {
            createdWhen: { type: 'timestamp' },
            updatedWhen: { type: 'timestamp' },
            disabled: { type: 'boolean', optional: true },
            roleID: { type: 'int' },
        },
        relationships: [
            { childOf: 'sharedList' },
        ],
        groupBy: [
            { subcollectionName: 'keys', key: 'sharedList' }
        ]
    },
    sharedPageInfo: {
        version: STORAGE_VERSIONS[2].date,
        fields: {
            createdWhen: { type: 'timestamp' },
            updatedWhen: { type: 'timestamp' },
            normalizedUrl: { type: 'string' },
            originalUrl: { type: 'string' },
            fullTitle: { type: 'string', optional: true },
        },
        relationships: [
            { alias: 'creator', childOf: 'user' }
        ]
    },
    sharedAnnotation: {
        version: STORAGE_VERSIONS[1].date,
        fields: {
            normalizedPageUrl: { type: 'string' },
            createdWhen: { type: 'timestamp' },
            uploadedWhen: { type: 'timestamp' },
            updatedWhen: { type: 'timestamp' },
            body: { type: 'string', optional: true },
            comment: { type: 'string', optional: true },
            selector: { type: 'string', optional: true },
        },
        relationships: [
            { alias: 'creator', childOf: 'user' }
        ]
    },
    sharedAnnotationListEntry: {
        version: STORAGE_VERSIONS[1].date,
        fields: {
            createdWhen: { type: 'timestamp' },
            uploadedWhen: { type: 'timestamp' },
            updatedWhen: { type: 'timestamp' },
            normalizedPageUrl: { type: 'string' },
        },
        relationships: [
            { alias: 'creator', childOf: 'user' },
            { connects: ['sharedList', 'sharedAnnotation'] },
        ],
    },
})
