import {
    PersonalCloudUpdatePushBatch,
    TranslationLayerDependencies,
    DownloadClientUpdatesReturnType,
    PersonalCloudClientInstruction,
    UploadClientUpdatesResult,
} from '../types'
import { uploadClientUpdateV24 } from './v24/upload'
import { downloadClientUpdatesV24 } from './v24/download'

export async function uploadClientUpdates(
    params: TranslationLayerDependencies & {
        updates: PersonalCloudUpdatePushBatch
    },
): Promise<UploadClientUpdatesResult> {
    const clientInstructions: PersonalCloudClientInstruction[] = []
    for (const update of params.updates) {
        const result = await uploadClientUpdateV24({
            ...params,
            update,
        })
        clientInstructions.push(...result.clientInstructions)
    }

    return { clientInstructions }
}

export async function downloadClientUpdates(
    params: TranslationLayerDependencies & {
        clientSchemaVersion: Date
        startTime: number
    },
): Promise<DownloadClientUpdatesReturnType> {
    return downloadClientUpdatesV24(params)
}
