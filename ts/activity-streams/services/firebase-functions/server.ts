import * as firebaseModule from 'firebase'
import * as functionsModule from 'firebase-functions'
import { ActivityStreamsService } from '../../types'
import { serviceMethodAsFunction, serviceMethodsAsFunctions } from '../../../firebase-backend/services/server'

export function activityStreamFunction(options: {
    firebase: typeof firebaseModule,
    functions: typeof functionsModule,
    methodName: keyof ActivityStreamsService,
}) {
    return serviceMethodAsFunction({ ...options, serviceName: 'activityStreams' })
}

export function activityStreamFunctions(options: {
    firebase: typeof firebaseModule,
    functions: typeof functionsModule
}) {
    return serviceMethodsAsFunctions({
        ...options, serviceName: 'activityStreams', methodNames: [
            'addActivity',
            'followEntity',
            'unfollowEntity',
            'getHomeFeedActivities',
            'getHomeFeedInfo',
            'getRawFeedActivitiesForDebug'
        ]
    })
}
