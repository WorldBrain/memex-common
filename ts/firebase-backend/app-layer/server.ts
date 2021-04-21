import type * as firebaseModule from 'firebase'
import type * as functionsModule from 'firebase-functions'
import type { CallableContext } from 'firebase-functions/lib/providers/https'
import { createStorage } from '../setup'
import { FunctionsBackendStorage } from '../types'
import { FirebaseApplicationLayer } from './types'

export function createServerApplicationLayer(options: {
    storage: FunctionsBackendStorage
}): FirebaseApplicationLayer {
    return {
        executeStorageModuleOperation: async params => {
            const storageModule = options.storage.modules[params.storageModule]
            return (storageModule as any).operation(params.operationName, params.operationArgs)
        }
    }
}

export function createServerApplicationLayerAsFunction(options: {
    firebase: typeof firebaseModule,
    functions: typeof functionsModule,
}) {
    return options.functions.https.onCall(async (data: any, _context: CallableContext) => {
        const storage = await createStorage(options)
        // const services = createServices({
        //     ...options,
        //     storage,
        //     getCurrentUserId: async () => _context.auth?.uid
        // })
        const applicationLayer = createServerApplicationLayer({ storage })
        return applicationLayer[data.methodName](data.methodArgs)
    })
}
