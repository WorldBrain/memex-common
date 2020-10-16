import StorageManager from '@worldbrain/storex'
import { ActionQueueStorage } from './storage'
import createResolvable, { Resolvable } from '@josephg/resolvable'
import { ActionQueueInteraction, ActionQueueStorageVersions, ActionExecutor, ActionPreprocessor } from './types'

export default class ActionQueue<Action extends { type: string }> {
    storage: ActionQueueStorage<Action>

    _hasPendingActions = false
    _queingAction?: Resolvable<void>
    _executingPendingActions?: Resolvable<{ result: 'success' | 'error' }>

    _pendingActionsRetry?: Resolvable<void>
    _scheduledRetry: () => Promise<void>
    _scheduledRetryTimeout: ReturnType<typeof setTimeout>

    constructor(
        private options: {
            storageManager: StorageManager
            collectionName: string
            retryIntervalInMs: number
            versions: ActionQueueStorageVersions
            executeAction: ActionExecutor<Action>
            preprocessAction?: ActionPreprocessor<Action>
        },
    ) {
        this.storage = new ActionQueueStorage<Action>(options)
    }

    async setup() {
        try {
            await this.executePendingActions()
        } catch (e) {
            // Log the error, but don't stop the entire extension setup
            // when we can't reach the sharing back-end
            console.error(e)
        }
    }

    async waitForSync() {
        await this._executingPendingActions
    }

    async scheduleAction(
        action: Action,
        options: {
            queueInteraction: ActionQueueInteraction
        },
    ) {
        const preprocessingResult = this.options.preprocessAction?.({ action })
        if (preprocessingResult) {
            if (preprocessingResult.valid === false) {
                throw new Error(`Tried to queue invalid action (${action.type}): ${preprocessingResult.validationError}`)
            }
            if (preprocessingResult.processed) {
                action = preprocessingResult.processed
            }
        }

        await this._queingAction

        if (options.queueInteraction === 'skip-queue') {
            await this.options.executeAction({ action })
            return
        }

        this._hasPendingActions = true
        this._queingAction = createResolvable()
        await this.storage.queueAction({ action })
        this._queingAction.resolve()
        delete this._queingAction

        const executePendingActions = this.executePendingActions()
        if (options.queueInteraction === 'queue-and-await') {
            await executePendingActions
        }
        executePendingActions.catch((e) => {
            console.error(
                `Error while executing action ${action.type} (retry scheduled):`,
            )
            console.error(e)
        })
    }

    async executePendingActions() {
        await this._executingPendingActions

        const executingPendingActions = (this._executingPendingActions = createResolvable())
        if (this._pendingActionsRetry) {
            this._pendingActionsRetry.resolve()
            delete this._pendingActionsRetry
        }

        try {
            while (true) {
                await this._queingAction

                const action = await this.storage.peekAction()
                if (!action) {
                    break
                }

                await this.options.executeAction({ action })
                await this.storage.removeAction({ actionId: action.id })
            }
            this._hasPendingActions = false
            executingPendingActions.resolve({ result: 'success' })
        } catch (e) {
            this._pendingActionsRetry = createResolvable()
            executingPendingActions.resolve({ result: 'error' })
            this._scheduledRetry = async () => {
                delete this._scheduledRetry
                delete this._scheduledRetryTimeout
                await this.executePendingActions()
            }
            this._scheduledRetryTimeout = setTimeout(
                this._scheduledRetry,
                this.options.retryIntervalInMs,
            )
            throw e
        } finally {
            delete this._executingPendingActions
        }
    }

    async forcePendingActionsRetry() {
        await this._scheduledRetry()
    }
}
