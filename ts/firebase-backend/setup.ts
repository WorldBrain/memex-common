import * as firebaseModule from 'firebase'
import * as functionsModule from 'firebase-functions'
import { EventContext } from 'firebase-functions';
import StorageManager from '@worldbrain/storex'
import { FirestoreStorageBackend } from '@worldbrain/storex-backend-firestore'
import { registerModuleMapCollections } from '@worldbrain/storex-pattern-modules'
import ContentConversationStorage from '../content-conversations/storage'
import ContentSharingStorage from '../content-sharing/storage'
import UserStorage from '../user-management/storage'
import GetStreamActivityStreamService from '../activity-streams/services/getstream'
import { FunctionsBackendStorage, FunctionsBackendServices } from './types'
import { STORAGE_HOOKS } from '../storage/hooks'
import { StorageHook } from 'src/storage/hooks/types';
import { QueryDocumentSnapshot } from 'firebase-functions/lib/providers/firestore';

export async function createStorage(options: {
    firebase: typeof firebaseModule,
    // functions: typeof functionsModule,
}): Promise<FunctionsBackendStorage> {
    const storageManager = new StorageManager({
        backend: new FirestoreStorageBackend({
            firebase: options.firebase,
            firestore: options.firebase.firestore(),
            firebaseModule,
        })
    })
    const contentSharing = new ContentSharingStorage({ storageManager, autoPkType: 'string' })
    const modules = {
        users: new UserStorage({ storageManager }),
        contentSharing: contentSharing,
        contentConversations: new ContentConversationStorage({ storageManager, contentSharing, autoPkType: 'string' }),
    }
    registerModuleMapCollections(storageManager.registry, modules)
    await storageManager.finishInitialization()

    return {
        manager: storageManager,
        modules,
    }
}

export function createServices(options: {
    functions: typeof functionsModule,
    storage: FunctionsBackendStorage,
    getCurrentUserId(): Promise<number | string | null>
}): FunctionsBackendServices {
    const activityStreams = new GetStreamActivityStreamService({
        apiKey: options.functions.config().getstreams.key!,
        apiSecret: options.functions.config().getstreams.secret!,
        getCurrentUserId: options.getCurrentUserId,
        storage: options.storage.modules,
    })

    return {
        activityStreams,
    }
}

function createWildcardPattern(collectionName: string, numberOfGroups: number) {
    const parts = [collectionName]
    for (let i = 0; i < numberOfGroups; ++i) {
        parts.push(`{document${i}}`)
        parts.push(`{collection${i}}`)
    }
    parts.push('{id}')
    return parts.join('/')
}

export function createFirestoreTrigger(params: {
    functions: typeof functionsModule,
    hook: StorageHook,
    getStorage: () => Promise<FunctionsBackendStorage>
}) {
    const { hook, functions } = params

    async function callHook(snapshot: QueryDocumentSnapshot, context: EventContext) {
        const storage = await params.getStorage()
        const services = await createServices({ functions: params.functions, storage, getCurrentUserId: async () => context.auth?.uid ?? null })

        await hook.function({
            operation: hook.operation,
            collection: hook.collection,
            objectId: snapshot.id,
            getObject: async () => {
                const pkIndex = storage.manager.registry.collections[hook.collection].pkIndex as string
                const object = {
                    [pkIndex]: snapshot.id,
                    ...snapshot.data(),
                }
                return object
            },
            services,
            userReference: context.auth && { type: 'user-reference', id: context.auth.uid },
        })
    }

    const wildcard = createWildcardPattern(hook.collection, hook.numberOfGroups)
    if (hook.operation === 'create') {
        return functions.firestore.document(wildcard).onCreate(async (snapshot, context) => {
            await callHook(snapshot, context)
        })
    } else if (hook.operation === 'delete') {
        return functions.firestore.document(wildcard).onDelete(async (snapshot, context) => {
            await callHook(snapshot, context)
        })
    } else {
        throw new Error(`Found hook with unkown operation type: ${hook.operation}`)
    }
}

export function createFirestoreTriggers(options: {
    functions: typeof functionsModule,
}) {
    let storage: FunctionsBackendStorage

    const hooks: any = {}
    for (const [hookName, hook] of Object.entries(STORAGE_HOOKS)) {
        hooks[hookName] = createFirestoreTrigger({
            functions: options.functions,
            hook,
            getStorage: async () => {
                if (!storage) {
                    storage = await createStorage({
                        firebase: admin as any,
                    })
                }
                return storage
            }
        })
    }
    return hooks
}
