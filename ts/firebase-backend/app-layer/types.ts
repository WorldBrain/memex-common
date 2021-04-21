import { ALLOWED_STORAGE_MODULE_OPERATIONS } from "./allowed-operations";

export interface FirebaseApplicationLayer {
    executeStorageModuleOperation<StorageModule extends keyof typeof ALLOWED_STORAGE_MODULE_OPERATIONS>(input: {
        storageModule: StorageModule,
        operationName: string,
        operationArgs: { [key: string]: any }
    }): Promise<any>
}
