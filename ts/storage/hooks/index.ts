import type { ChangeWatchMiddlewareSettings } from '@worldbrain/storex-middleware-change-watcher'
import type { StorageHookContext, StorageHook, StorageHooks } from './types'
import type { UserReference } from '../..//web-interface/types/users'
import type { Services } from '../../services/types'
import StorageManager from '@worldbrain/storex'
import { CONTENT_CONVERSATIONS_HOOKS } from '../../content-conversations/storage/hooks'
import { ACTIVITIY_FOLLOWS_HOOKS } from '../../activity-follows/storage/hooks'
import { CONTENT_SHARING_HOOKS } from '../../content-sharing/storage/hooks'

export const STORAGE_HOOKS: StorageHooks = {
    ...CONTENT_SHARING_HOOKS,
    ...CONTENT_CONVERSATIONS_HOOKS,
    ...ACTIVITIY_FOLLOWS_HOOKS,
}

type HooksByCollectionAndOperation = {
    [collection: string]: {
        [operation: string]: { hook: StorageHook; pkIndex: string }
    }
}

interface Dependencies {
    services: Services
    serverStorageManager: StorageManager
    getCurrentUserReference: () => Promise<UserReference | null>
}

export class StorageHooksChangeWatcher {
    initialized = false
    collectionsToWatch?: Set<string>
    hooksByCollectionAndOperation: HooksByCollectionAndOperation = {}
    dependencies?: Dependencies

    setUp(dependencies: Dependencies) {
        if (this.initialized) {
            throw new Error(`Can't set up storage hooks more than once`)
        }

        this.collectionsToWatch = new Set<string>()
        for (const hook of Object.values(STORAGE_HOOKS)) {
            const { collection } = hook

            this.collectionsToWatch.add(collection)
            const pkIndex =
                dependencies.serverStorageManager.registry.collections[
                    collection
                ].pkIndex
            if (typeof pkIndex !== 'string') {
                throw new Error(
                    `Can't use storage hooks on collections that don't have a simple primary key ('${collection}').`,
                )
            }

            const collectionHooks: HooksByCollectionAndOperation[keyof HooksByCollectionAndOperation] =
                this.hooksByCollectionAndOperation[collection] ?? {}
            collectionHooks[hook.operation] = { hook, pkIndex }
            this.hooksByCollectionAndOperation[collection] = collectionHooks
        }

        this.dependencies = dependencies
        this.initialized = true
    }

    shouldWatchCollection: ChangeWatchMiddlewareSettings['shouldWatchCollection'] = (
        collection,
    ) => {
        return this.collectionsToWatch?.has?.(collection) ?? false
    }

    preprocessOperation: ChangeWatchMiddlewareSettings['preprocessOperation'] = async ({
        info,
    }) => {
        for (const change of info.changes) {
            const collectionHooks = this.hooksByCollectionAndOperation[
                change.collection
            ]
            if (!collectionHooks) {
                continue
            }
            const hookInfo = collectionHooks[change.type]
            if (!hookInfo) {
                continue
            }
            const { hook, pkIndex } = hookInfo

            if (change.type === 'delete') {
                for (const pk of change.pks) {
                    const pkAsScalar = pk as string | number
                    const context: StorageHookContext = {
                        objectId: pkAsScalar,
                        operation: change.type,
                        collection: change.collection,
                        services: this.dependencies!.services,
                        userReference: await this.dependencies!.getCurrentUserReference(),
                        getObject: async () =>
                            this.dependencies!.serverStorageManager.operation(
                                'findObject',
                                change.collection,
                                { [pkIndex]: pkAsScalar },
                            ),
                    }
                    await hook.function(context)
                }
            }
        }
    }

    postprocessOperation: ChangeWatchMiddlewareSettings['postprocessOperation'] = async ({
        info,
    }) => {
        for (const change of info.changes) {
            const collectionHooks = this.hooksByCollectionAndOperation[
                change.collection
            ]
            if (!collectionHooks) {
                continue
            }
            const hookInfo = collectionHooks[change.type]
            if (!hookInfo) {
                continue
            }
            const { hook, pkIndex } = hookInfo

            if (change.type === 'create') {
                const pkAsScalar = change.pk as string | number
                const context: StorageHookContext = {
                    objectId: pkAsScalar,
                    operation: change.type,
                    collection: change.collection,
                    userReference: await this.dependencies!.getCurrentUserReference(),
                    getObject: async () =>
                        this.dependencies!.serverStorageManager.operation(
                            'findObject',
                            change.collection,
                            { [pkIndex]: pkAsScalar },
                        ),
                    services: this.dependencies!.services,
                }
                await hook.function(context)
            }
        }
    }
}
