import * as firebaseModule from 'firebase'
import * as functionsModule from 'firebase-functions'
import { CallableContext } from 'firebase-functions/lib/providers/https'
import StorageManager from '@worldbrain/storex'
import { FirestoreStorageBackend } from '@worldbrain/storex-backend-firestore'
import { registerModuleMapCollections } from '@worldbrain/storex-pattern-modules'
import ContentConversationStorage from '../../../content-conversations/storage'
import ContentSharingStorage from '../../../content-sharing/storage'
import UserStorage from '../../../user-management/storage'
import GetStreamActivityStreamService from '../getstream'
import { ActivityStreamsService } from '../../types'

export type ActivityStreamServiceMethod = keyof ActivityStreamsService

export function activityStreamFunction(options: {
    firebase: typeof firebaseModule,
    functions: typeof functionsModule,
    method: ActivityStreamServiceMethod,
}) {
    return options.functions.https.onCall(async (data: any, _context: CallableContext) => {
        const storageManager = new StorageManager({
            backend: new FirestoreStorageBackend({
                firebase: options.firebase,
                firestore: options.firebase.firestore(),
                firebaseModule,
            })
        })
        const users = new UserStorage({ storageManager })
        const contentSharing = new ContentSharingStorage({ storageManager, autoPkType: 'string' })
        const contentConversations = new ContentConversationStorage({ storageManager, contentSharing, autoPkType: 'string' })
        registerModuleMapCollections(storageManager.registry, {
            users,
            contentSharing,
            contentConversations,
        })
        await storageManager.finishInitialization()

        const activityStreams = new GetStreamActivityStreamService({
            apiKey: options.functions.config().getstreams.key!,
            apiSecret: options.functions.config().getstreams.secret!,
            getCurrentUserId: async () => _context.auth?.uid,
            storage: {
                contentSharing,
                contentConversations,
                users,
            }
        })

        return activityStreams[options.method as string](data)
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
        ...activityStreamFunctionWithKey('getHomeActivities'),
    }
}
