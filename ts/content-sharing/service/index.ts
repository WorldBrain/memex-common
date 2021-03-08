import { ContentSharingServiceInterface } from "./types";
import { processListKey } from "../keys";
import ContentSharingStorage from "../storage";

export class ContentSharingService implements ContentSharingServiceInterface {
    constructor(private dependencies: {
        contentSharing: ContentSharingStorage,
        getCurrentUserId: () => Promise<number | string | null>
    }) {

    }

    async processListKey(params: { keyString: string, listId: number | string }): Promise<{ success: boolean }> {
        const userId = await this.dependencies.getCurrentUserId()
        if (!userId) {
            throw new Error(`Tried to process list key without being authenticated`)
        }

        return {
            success: await processListKey({
                contentSharing: this.dependencies.contentSharing,
                userReference: { type: 'user-reference', id: userId },
                keyString: params.keyString,
                listReference: { type: 'shared-list-reference', id: params.listId },
            })
        }
    }
}
