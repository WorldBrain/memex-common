import StorageManager from '@worldbrain/storex'

export interface PersonalCloudBackend {
    pushUpdates(updates: PersonalCloudUpdatePushBatch): Promise<UploadClientUpdatesResult>
    streamUpdates(): AsyncIterableIterator<PersonalCloudUpdateBatch>
    uploadToMedia(params: UploadToMediaParams): Promise<void>
    downloadFromMedia(params: {
        path: string
    }): Promise<string | Blob | null>
}

export interface UploadToMediaParams {
    deviceId: number | string
    mediaPath: string
    mediaObject: string | Blob
    changeInfo: MediaChangeInfo
}

export interface UploadClientUpdatesResult {
    clientInstructions: PersonalCloudClientInstruction[]
}

export interface DownloadClientUpdatesReturnType {
    batch: PersonalCloudUpdateBatch
    lastSeen: number
    maybeHasMore: boolean
}

export interface PersonalCloudService {
    uploadClientUpdates(params: {
        updates: PersonalCloudUpdatePushBatch
    }): Promise<UploadClientUpdatesResult>
    downloadClientUpdates(params: {
        clientSchemaVersion: Date
        startTime: number
    }): Promise<DownloadClientUpdatesReturnType>
}

export type PersonalCloudUpdate =
    | PersonalCloudOverwriteUpdate
    | PersonalCloudDeleteUpdate
export enum PersonalCloudUpdateType {
    Overwrite = 'overwrite',
    Delete = 'delete',
}
export interface PersonalCloudOverwriteUpdate extends PersonalCloudObjectInfo {
    // Overwrite means that it should be created if not exists
    // and all fields of existing objects replaced if it exists
    type: PersonalCloudUpdateType.Overwrite
}
export interface PersonalCloudDeleteUpdate {
    type: PersonalCloudUpdateType.Delete
    collection: string
    where: { [key: string]: number | string }
    storage?: ClientStorageType
}

export interface PersonalCloudObjectInfo {
    collection: string
    object: any
    storage?: ClientStorageType
    where?: { [key: string]: any }

    // media says which paths to retrieve (values) storing them in which keys of the object (key)
    media?: { [key: string]: string }
}

export type PersonalCloudUpdateBatch = Array<PersonalCloudUpdate>
export type PersonalCloudUpdatePushBatch = Array<PersonalCloudUpdatePush>
export type PersonalCloudUpdatePush = {
    schemaVersion: Date
    deviceId: number | string
} & PersonalCloudUpdate

export interface TranslationLayerDependencies {
    storageManager: StorageManager
    userId: number | string
    getNow(): number
}

export enum PersonalCloudClientInstructionType {
    UploadToStorage = 'upload-to-storage'
}
export type PersonalCloudClientInstruction = UploadToStorageClientInstruction
export interface UploadToStorageClientInstruction {
    type: PersonalCloudClientInstructionType.UploadToStorage
    storage: ClientStorageType
    collection: string

    // Data about what should be uploaded from where
    uploadWhere: { [key: string]: any }
    uploadField: string
    uploadPath: string

    // Data about what should be written to the `personalDataChange` log
    changeInfo: MediaChangeInfo
}

export type ClientStorageType = 'normal' | 'persistent'

//  This is the `info` attached to a `personalDataChange` generated by an upload to Cloud Storage
export interface MediaChangeInfo {
    type: 'htmlBody'
    normalizedUrl: string
}
