import StorageManager from '@worldbrain/storex'

export interface PersonalCloudBackend {
    pushUpdates(updates: PersonalCloudUpdatePushBatch): Promise<UploadClientUpdatesResult>
    streamUpdates(): AsyncIterableIterator<PersonalCloudUpdateBatch>
    uploadToStorage(params: { path: string, object: string | Blob }): Promise<void>
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
}

export interface PersonalCloudObjectInfo {
    collection: string
    object: any
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
    storage: 'normal' | 'persistent'
    collection: string
    where: { [key: string]: any }
    field: string
    path: string
}
