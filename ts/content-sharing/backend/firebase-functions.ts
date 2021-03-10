import * as firebaseModule from 'firebase'
import * as functionsModule from 'firebase-functions'
import { serviceMethodsAsFunctions } from '../../firebase-backend/services/server'

export function contentSharingFunctions(options: {
    firebase: typeof firebaseModule,
    functions: typeof functionsModule
}) {
    return serviceMethodsAsFunctions({
        ...options, serviceName: 'contentSharing', methodNames: [
            'processListKey'
        ]
    })
}
