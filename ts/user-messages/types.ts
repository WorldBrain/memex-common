export type UserMessage = JoinedSharedListMessage
export interface JoinedSharedListMessage {
    type: 'joined-collection'
    sharedListId: number | string
}