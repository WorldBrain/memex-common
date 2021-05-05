export const ALLOWED_STORAGE_MODULE_OPERATIONS = {
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
        findAnnotationEntriesForAnnotations: true,
        findListRoles: true,
        findPageInfoByCreatorAndUrl: true,
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
    }
}
