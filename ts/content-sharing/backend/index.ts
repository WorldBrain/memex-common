import { ContentSharingBackendInterface } from "./types";
import { processListKey } from "../keys";
import ContentSharingStorage from "../storage";
import { UserMessageService } from "src/user-messages/service/types";

export class ContentSharingBackend implements ContentSharingBackendInterface {
    constructor(private dependencies: {
        contentSharing: ContentSharingStorage,
        userMessages: UserMessageService,
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
                userMessages: this.dependencies.userMessages,
                userReference: { type: 'user-reference', id: userId },
                keyString: params.keyString,
                listReference: { type: 'shared-list-reference', id: params.listId },
            })
        }
    }
}
