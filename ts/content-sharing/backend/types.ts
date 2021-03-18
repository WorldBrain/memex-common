export interface ContentSharingBackendInterface {
    processListKey(params: { keyString: string, listId: number | string }): Promise<{ success: boolean }>
}
