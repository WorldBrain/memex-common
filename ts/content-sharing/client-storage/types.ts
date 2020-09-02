export type ContentSharingAction =
    | AddSharedListEntriesAction
    | RemoveSharedListEntryAction
    | RemoveSharedAnnotationListEntriesAction
    | ChangeSharedListTitleAction
    | ChangeSharedListDescriptionAction
    | ShareAnnotationsAction
    | UnshareAnnotationsAction
    | AddAnnotationEntriesAction
    | UpdateAnnotationCommentAction
    | EnsurePageInfoAction

export interface AddSharedListEntriesAction {
    type: 'add-shared-list-entries'
    localListId: number
    remoteListId: string
    data: Array<{
        createdWhen: number | '$now'
        entryTitle: string
        originalUrl: string
        normalizedUrl: string
    }>
}
export interface RemoveSharedListEntryAction {
    type: 'remove-shared-list-entry'
    localListId: number
    remoteListId: string
    normalizedUrl: string
}

export interface RemoveSharedAnnotationListEntriesAction {
    type: 'remove-shared-annotation-list-entries'
    remoteAnnotationIds: Array<string | number>
    remoteListId: string
}

export interface ChangeSharedListTitleAction {
    type: 'change-shared-list-title'
    localListId: number
    remoteListId: string
    newTitle: string
}

export interface ChangeSharedListDescriptionAction {
    type: 'change-shared-list-description'
    localListId: number
    remoteListId: string
    newDescription: string
}

export interface ShareAnnotationsAction {
    type: 'share-annotations'
    localListIds: number[]
    data: {
        [normalizedPageUrl: string]: Array<{
            localId: string
            createdWhen: number
            body?: string
            comment?: string
            selector?: string
        }>
    }
}

export interface UnshareAnnotationsAction {
    type: 'unshare-annotations'
    remoteAnnotationIds: Array<string | number>
}

export interface AddAnnotationEntriesAction {
    type: 'add-annotation-entries'
    remoteListIds: string[]
    remoteAnnotations: Array<{
        remoteId: string | number
        normalizedPageUrl: string
        createdWhen: number
    }>
}

export interface UpdateAnnotationCommentAction {
    type: 'update-annotation-comment'
    localAnnotationId: string
    remoteAnnotationId: string | number
    updatedComment: string
}

export interface EnsurePageInfoAction {
    type: 'ensure-page-info'
    data: Array<{
        createdWhen: number | '$now'
        fullTitle: string
        originalUrl: string
        normalizedUrl: string
    }>
}
