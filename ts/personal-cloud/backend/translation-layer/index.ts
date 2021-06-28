import {
    PersonalCloudUpdatePushBatch,
    TranslationLayerDependencies,
    DownloadClientUpdatesReturnType,
} from '../types'
import { uploadClientUpdateV24 } from './v24/upload'
import { downloadClientUpdatesV24 } from './v24/download'

export async function uploadClientUpdates(
    params: TranslationLayerDependencies & {
        updates: PersonalCloudUpdatePushBatch
    },
): Promise<void> {
    for (const update of params.updates) {
        await uploadClientUpdateV24({
            ...params,
            update,
        })
    }
}

export async function downloadClientUpdates(
    params: TranslationLayerDependencies & {
        clientSchemaVersion: Date
        startTime: number
    },
): Promise<DownloadClientUpdatesReturnType> {
    return downloadClientUpdatesV24(params)
}
