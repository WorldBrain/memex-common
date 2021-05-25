import { FunctionsBackendStorage } from '../types'

export const ALLOWED_STORAGE_MODULE_OPERATIONS: {
    [K in keyof FunctionsBackendStorage['modules']]?: {
        [operation: string]: true
    }
} = {
    contentSharing: {
        findListsByIDs: true,
        findListEntriesByList: true,
        findListEntriesByUrl: true,
        findListEntriesByUrls: true,
        findSingleEntryByUserAndUrl: true,
        findAnnotationsByIds: true,
        findAnnotationsByCreatorAndPageUrl: true,
        findSingleAnnotationEntryByListPage: true,
        findAnnotationEntriesByListPages: true,
        findAnnotationEntriesByList: true,
        findAnnotationEntriesByLists: true,
        findAnnotationEntriesForAnnotations: true,
        findListRoles: true,
        findPageInfoByCreatorAndUrl: true,
        findListRolesByUser: true,
        findListsByCreator: true,
    },
    contentConversations: {
        findThreadsByPages: true,
        findThreadByAnnotation: true,
        findThreadsByAnnotations: true,
        findRepliesByCreatorAndPageUrl: true,
        findRepliesByAnnotation: true,
        findRepliesByAnnotations: true,
    },
    activityFollows: {
        findFollow: true,
        findFollowsByCollection: true,
        findFollowsByEntity: true,
    },
    users: {
        findUsersByIds: true,
        findUserPublicProfilesByIds: true,
    },
}
