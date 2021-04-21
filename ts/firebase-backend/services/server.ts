import firebaseModule from 'firebase'
import functionsModule from 'firebase-functions'
import { CallableContext } from 'firebase-functions/lib/providers/https'
import { createStorage, createServices } from '../setup'
import { FunctionsBackendServices } from '../types'

export function serviceMethodAsFunction<ServiceName extends keyof FunctionsBackendServices>(options: {
    firebase: typeof firebaseModule,
    functions: typeof functionsModule,
    serviceName: ServiceName
    methodName: keyof FunctionsBackendServices[ServiceName],
}) {
    return options.functions.https.onCall(async (data: any, _context: CallableContext) => {
        const storage = await createStorage(options)
        const services = createServices({
            ...options,
            storage,
            getCurrentUserId: async () => _context.auth?.uid
        })

        return services[options.serviceName][options.methodName as string](data)
    })
}

export function serviceMethodsAsFunctions<ServiceName extends keyof FunctionsBackendServices>(options: {
    firebase: typeof firebaseModule,
    functions: typeof functionsModule,
    serviceName: ServiceName
    methodNames: Array<keyof FunctionsBackendServices[ServiceName]>,
}) {
    const asFunctions: { [key: string]: any } = {}
    for (const methodName of options.methodNames) {
        asFunctions[methodName as string] = serviceMethodAsFunction({ ...options, methodName })
    }
    return asFunctions
}
