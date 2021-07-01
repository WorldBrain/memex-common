import StorageManager from "@worldbrain/storex";
import { PersonalCloudService, TranslationLayerDependencies, PersonalCloudUpdatePushBatch, PersonalCloudUpdateBatch } from "../backend/types";
import { uploadClientUpdates, downloadClientUpdates } from "../backend/translation-layer";

export default class StorexPersonalCloudService implements PersonalCloudService {
    constructor(public options: {
        storageManager: StorageManager
        getNow(): number
        getCurrentUserId(): Promise<number | string | null>
    }) {
    }

    async uploadClientUpdates(
        params: {
            updates: PersonalCloudUpdatePushBatch
        },
    ) {
        const userId = await this.options.getCurrentUserId()
        if (!userId) {
            throw new Error(`Tried to upload client updates without being logged in`)
        }

        return uploadClientUpdates({
            ...params,
            storageManager: this.options.storageManager,
            userId,
            getNow: this.options.getNow,
        })
    }

    async downloadClientUpdates(
        params: {
            clientSchemaVersion: Date
            startTime: number
        },
    ) {
        const userId = await this.options.getCurrentUserId()
        if (!userId) {
            throw new Error(`Tried to upload client updates without being logged in`)
        }

        return downloadClientUpdates({
            ...params,
            userId,
            storageManager: this.options.storageManager,
            getNow: this.options.getNow,
        })
    }
}
