export interface ContentSharingServiceInterface {
    processListKey(params: { keyString: string, listId: number | string }): Promise<{ success: boolean }>
}
