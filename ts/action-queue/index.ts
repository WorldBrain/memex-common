import StorageManager from '@worldbrain/storex'
import { ActionQueueStorage } from './storage'
import createResolvable, { Resolvable } from '@josephg/resolvable'
import { ActionQueueInteraction, ActionQueueStorageVersions, ActionExecutor, ActionPreprocessor } from './types'

export default class ActionQueue<Action extends { type: string }> {
    storage: ActionQueueStorage<Action>

    _hasPendingActions = false
    _queingAction?: Resolvable<void>
    _executingPendingActions?: Resolvable<{ result: 'success' | 'error' }>

    _paused?: Resolvable<void>
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

    async setup(options?: { paused?: boolean }) {
        try {
            await this.executePendingActions()
        } catch (e) {
            // Log the error, but don't stop the entire extension setup
            // when we can't reach the sharing back-end
            console.error(e)
        }
    }

    pause() {
        if (!this._paused) {
            this._paused = createResolvable()
        }
    }

    unpause() {
        const paused = this._paused
        if (paused) {
            delete this._paused
            paused.resolve()
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
        await this._paused

        const executingPendingActions = (this._executingPendingActions = createResolvable())
        if (this._pendingActionsRetry) {
            this._pendingActionsRetry.resolve()
            delete this._pendingActionsRetry
        }

        const scheduleRetry = () => {
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
        }

        try {
            while (true) {
                await this._queingAction

                const action = await this.storage.peekAction()
                if (!action) {
                    break
                }

                const result = await this.options.executeAction({ action })
                if (result && result.pauseAndRetry) {
                    this.pause()
                    scheduleRetry()
                    return
                }
                await this.storage.removeAction({ actionId: action.id })
            }
            this._hasPendingActions = false
            executingPendingActions.resolve({ result: 'success' })
        } catch (e) {
            scheduleRetry()
            throw e
        } finally {
            delete this._executingPendingActions
        }
    }

    async forcePendingActionsRetry() {
        await this._scheduledRetry()
    }
}
