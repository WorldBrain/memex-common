export type UserMessage = JoinedSharedListMessage | CreatedAnnotationMessage

export interface JoinedSharedListMessage {
    type: 'joined-collection'
    sharedListId: number | string
}

export interface CreatedAnnotationMessage {
    type: 'created-annotation'
    sharedAnnotationId: number | string
}
