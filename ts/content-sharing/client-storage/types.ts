export type ContentSharingAction =
    | AddSharedListEntriesAction
    | RemoveSharedListEntryAction
    | ChangeSharedListTitleAction
    | ChangeSharedListDescriptionAction
    | ShareAnnotationsAction
    | UpdateAnnotationComment

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

export interface UpdateAnnotationComment {
    type: 'update-annotation-comment'
    localAnnotationId: string
    remoteAnnotationId: string
    updatedComment: string
}
