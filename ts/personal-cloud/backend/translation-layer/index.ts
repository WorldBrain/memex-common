import type {
    PersonalCloudUpdatePushBatch,
    TranslationLayerDependencies,
    DownloadClientUpdatesReturnType,
    PersonalCloudClientInstruction,
    UploadClientUpdatesResult,
} from '../types'
import type { PersonalMemexExtensionSetting } from '../../../web-interface/types/storex-generated/personal-cloud'
import { uploadClientUpdateV24 } from './v24/upload'
import { downloadClientUpdatesV24 } from './v24/download'
import { UploadStorageUtils } from './storage-utils'
import { EXTENSION_SETTINGS_NAME } from '../../../extension-settings/constants'

async function maybeTriggerReadwiseIntegration(
    params: TranslationLayerDependencies & {
        annotationIds: Set<string | number>
        deviceId: string | number
    },
) {
    const storageUtils = new UploadStorageUtils(params)
    const settingsRecord = await storageUtils.findOne<
        PersonalMemexExtensionSetting
    >('personalMemexExtensionSetting', {
        name: EXTENSION_SETTINGS_NAME.ReadwiseAPIKey,
    })

    if (!(typeof settingsRecord?.value === 'string')) {
        return // No readwise API key exists, so don't create readwise actions
    }

    for (const personalAnnotation of [...params.annotationIds]) {
        await storageUtils.findOrCreate('personalReadwiseAction', {
            personalAnnotation,
        })
    }
}

export async function uploadClientUpdates(
    params: TranslationLayerDependencies & {
        updates: PersonalCloudUpdatePushBatch
    },
): Promise<UploadClientUpdatesResult> {
    const clientInstructions: PersonalCloudClientInstruction[] = []
    const readwiseAnnotationIds = new Set<string | number>()

    for (const update of params.updates) {
        const result = await uploadClientUpdateV24({
            ...params,
            update,
        })
        clientInstructions.push(...result.clientInstructions)
        result.annotationIdsForReadwise.forEach((id) =>
            readwiseAnnotationIds.add(id),
        )
    }

    // TODO: Confirm deviceId is always the same for all updates in batch
    const deviceId = params.updates[0]?.deviceId
    if (deviceId) {
        await maybeTriggerReadwiseIntegration({
            ...params,
            deviceId,
            annotationIds: readwiseAnnotationIds,
        })
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
