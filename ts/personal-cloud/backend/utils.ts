import StorageManager from '@worldbrain/storex'
import { PersonalDataChange } from '../../web-interface/types/storex-generated/personal-cloud'
import { DataChangeType } from '../storage/types'
import { UploadToMediaParams } from "./types"

export async function writeMediaChange(params: Pick<UploadToMediaParams, 'mediaPath' | 'changeInfo' | 'deviceId'> & {
    storageManager: StorageManager
    userId: number | string
}) {
    const dataChange: PersonalDataChange = {
        type: DataChangeType.Modify,
        createdWhen: '$now' as any,
        collection: ':media',
        objectId: params.mediaPath,
        info: params.changeInfo,
    }
    await params.storageManager.collection('personalDataChange').createObject({
        ...dataChange,
        user: params.userId,
        createdByDevice: params.deviceId,
    })
}
