import { StorageOperationDefinitions } from "@worldbrain/storex-pattern-modules";
import { PAGE_LIST_ENTRY_ORDER, ANNOTATION_LIST_ENTRY_ORDER } from "./constants";

export const CONTENT_SHARING_OPERATIONS: StorageOperationDefinitions = {
    createSharedList: {
        operation: 'createObject',
        collection: 'sharedList',
    },
    createSharedListCreatorInfo: {
        operation: 'createObject',
        collection: 'sharedListCreatorInfo',
    },
    createListEntries: {
        operation: 'executeBatch',
        args: ['$batch'],
    },
    findListByID: {
        operation: 'findObject',
        collection: 'sharedList',
        args: { id: '$id:pk' }
    },
    findListsByIDs: {
        operation: 'findObjects',
        collection: 'sharedList',
        args: {
            id: { $in: '$ids:pk[]' },
        }
    },
    findListEntriesByList: {
        operation: 'findObjects',
        collection: 'sharedListEntry',
        args: [
            { sharedList: '$sharedListID:pk' },
            { order: [['createdWhen', PAGE_LIST_ENTRY_ORDER]] }
        ]
    },
    findListEntriesByUrl: {
        operation: 'findObjects',
        collection: 'sharedListEntry',
        args: {
            sharedList: '$sharedList:pk',
            normalizedUrl: '$normalizedUrl:string'
        }
    },
    findListEntriesByUrls: {
        operation: 'findObjects',
        collection: 'sharedListEntry',
        args: {
            sharedList: '$sharedList:pk',
            normalizedUrl: { $in: '$normalizedUrls:string' }
        }
    },
    findListEntryById: {
        operation: 'findObject',
        collection: 'sharedListEntry',
        args: {
            id: '$id:pk',
        }
    },
    findSingleEntryByUserAndUrl: {
        operation: 'findObject',
        collection: 'sharedListEntry',
        args: [
            {
                creator: '$creator:pk',
                normalizedUrl: '$normalizedUrl:string'
            },
            { limit: 1 }
        ]
    },
    deleteListEntriesByIds: {
        operation: 'deleteObjects',
        collection: 'sharedListEntry',
        args: { id: { $in: '$ids:array:pk' } }
    },
    updateListTitle: {
        operation: 'updateObjects',
        collection: 'sharedList',
        args: [
            { id: '$id' },
            { title: '$newTitle' }
        ]
    },
    createPageInfo: {
        operation: 'createObject',
        collection: 'sharedPageInfo',
    },
    findPageInfoById: {
        operation: 'findObject',
        collection: 'sharedPageInfo',
        args: {
            id: '$id:pk'
        }
    },
    findPageInfoByCreatorAndUrl: {
        operation: 'findObject',
        collection: 'sharedPageInfo',
        args: {
            normalizedUrl: '$normalizedUrl:string',
            creator: '$creator:pk'
        }
    },
    createAnnotationsAndEntries: {
        operation: 'executeBatch',
        args: ['$batch'],
    },
    createAnnotationListEntries: {
        operation: 'executeBatch',
        args: ['$batch'],
    },
    findSingleAnnotationEntryByListPage: {
        operation: 'findObject',
        collection: 'sharedAnnotationListEntry',
        args: [
            {
                sharedList: '$sharedList:pk',
                normalizedPageUrl: '$normalizedPageUrl:string',
            },
            { limit: 1 }
        ]
    },
    findAnnotationEntriesByListPages: {
        operation: 'findObjects',
        collection: 'sharedAnnotationListEntry',
        args: [
            {
                sharedList: '$sharedList:pk',
                normalizedPageUrl: { $in: '$normalizedPageUrls:array:string' },
            },
            { order: [['createdWhen', ANNOTATION_LIST_ENTRY_ORDER]] }
        ]
    },
    findAnnotationEntriesByList: {
        operation: 'findObjects',
        collection: 'sharedAnnotationListEntry',
        args: [
            {
                sharedList: '$sharedList:pk',
            },
            { order: [['createdWhen', ANNOTATION_LIST_ENTRY_ORDER]] }
        ]
    },
    findAnnotationsByIds: {
        operation: 'findObjects',
        collection: 'sharedAnnotation',
        args: {
            id: { $in: '$ids:array:pk' }
        }
    },
    findAnnotationById: {
        operation: 'findObject',
        collection: 'sharedAnnotation',
        args: {
            id: '$id:pk'
        }
    },
    findAnnotationsByCreatorAndPageUrl: {
        operation: 'findObjects',
        collection: 'sharedAnnotation',
        args: {
            creator: '$creator:pk',
            normalizedPageUrl: '$normalizedPageUrl:pk',
        }
    },
    findAnnotationEntriesForAnnotations: {
        operation: 'findObjects',
        collection: 'sharedAnnotationListEntry',
        args: {
            sharedAnnotation: { $in: '$sharedAnnotations:array:pk' },
        }
    },
    deleteAnnotationEntries: {
        operation: 'executeBatch',
        args: ['$batch'],
    },
    deleteAnnotations: {
        operation: 'executeBatch',
        args: ['$batch'],
    },
    updateAnnotationComment: {
        operation: 'updateObjects',
        collection: 'sharedAnnotation',
        args: [
            { id: '$id:pk' },
            { comment: '$comment:string' }
        ]
    },
    createListRole: {
        operation: 'executeBatch',
        args: [[
            {
                placeholder: 'role',
                operation: 'createObject',
                collection: 'sharedListRole',
                args: {
                    createdWhen: '$createdWhen:timestamp',
                    updatedWhen: '$updatedWhen:timestamp',
                    roleID: '$roleID:timestamp',
                    sharedList: '$sharedList:pk',
                    user: '$user:pk',
                },
            },
            {
                placeholder: 'roleByUser',
                operation: 'createObject',
                collection: 'sharedListRoleByUser',
                args: {
                    createdWhen: '$createdWhen:timestamp',
                    updatedWhen: '$updatedWhen:timestamp',
                    roleID: '$roleID:timestamp',
                    sharedList: '$sharedList:pk',
                    user: '$user:pk',
                },
            },
        ]]
    },
    removeListRole: {
        operation: 'executeBatch',
        args: [[
            {
                placeholder: 'role',
                operation: 'deleteObject',
                collection: 'sharedListRole',
                args: {
                    sharedList: '$sharedList:pk',
                    user: '$user:pk',
                },
            },
            {
                placeholder: 'roleByUser',
                operation: 'removeObject',
                collection: 'sharedListRoleByUser',
                args: {
                    sharedList: '$sharedList:pk',
                    user: '$user:pk',
                },
            },
        ]]
    },
    updateListRole: {
        operation: 'updateObject',
        collection: 'sharedListRole',
        args: [{
            sharedList: '$sharedList:pk',
            user: '$user:pk',
        }, {
            roleID: '$roleID:number',
        }]
    },
    findListRole: {
        operation: 'findObject',
        collection: 'sharedListRole',
        args: {
            sharedList: '$sharedList:pk',
            user: '$user:pk'
        }
    },
    findListRoles: {
        operation: 'findObjects',
        collection: 'sharedListRole',
        args: {
            sharedList: '$sharedList:pk',
        }
    },
    createListKey: {
        operation: 'createObject',
        collection: 'sharedListKey',
    },
    findKeysByList: {
        operation: 'findObjects',
        collection: 'sharedListKey',
        args: {
            sharedList: '$sharedList:pk'
        }
    },
    findListKey: {
        operation: 'findObject',
        collection: 'sharedListKey',
        args: {
            sharedList: '$sharedList:pk',
            id: '$id:string',
        }
    },
    deleteListKey: {
        operation: 'deleteObject',
        collection: 'sharedListKey',
        args: {
            id: '$id:string'
        }
    }
}
