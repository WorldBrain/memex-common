import * as firebaseModule from 'firebase'
import * as functionsModule from 'firebase-functions'
import { CallableContext } from 'firebase-functions/lib/providers/https'
import { createStorage, createServices } from '../../../firebase-backend/setup'
import { ActivityStreamsService } from '../../types'

export type ActivityStreamServiceMethod = keyof ActivityStreamsService

export function activityStreamFunction(options: {
    firebase: typeof firebaseModule,
    functions: typeof functionsModule,
    method: ActivityStreamServiceMethod,
}) {
    return options.functions.https.onCall(async (data: any, _context: CallableContext) => {
        const storage = await createStorage(options)
        const services = createServices({
            ...options,
            storage,
            getCurrentUserId: async () => _context.auth?.uid
        })

        return services.activityStreams[options.method as string](data)
    })
}

export function activityStreamFunctions(options: {
    firebase: typeof firebaseModule,
    functions: typeof functionsModule
}) {
    function activityStreamFunctionWithKey(method: ActivityStreamServiceMethod) {
        return {
            [method]: activityStreamFunction({
                firebase: options.firebase,
                functions: options.functions,
                method,
            })
        }
    }

    return {
        ...activityStreamFunctionWithKey('addActivity'),
        ...activityStreamFunctionWithKey('followEntity'),
        ...activityStreamFunctionWithKey('unfollowEntity'),
        ...activityStreamFunctionWithKey('getHomeFeedActivities'),
        ...activityStreamFunctionWithKey('getHomeFeedInfo'),
    }
}
