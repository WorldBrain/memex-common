import { StorageOperationDefinitions } from '@worldbrain/storex-pattern-modules'

export const PERSONAL_CLOUD_OPERATIONS: StorageOperationDefinitions = {
    createDeviceInfo: {
        operation: 'createObject',
        collection: 'personalDeviceInfo',
    },
}
