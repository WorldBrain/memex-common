import {
    StorageModule,
    StorageModuleConfig,
    StorageModuleConstructorArgs,
} from '@worldbrain/storex-pattern-modules'
import { ActionQueueStorageVersions } from './types'

export class ActionQueueStorage<Action> extends StorageModule {
    constructor(private options: StorageModuleConstructorArgs & { collectionName: string, versions: ActionQueueStorageVersions }) {
        super(options)
    }

    getConfig = (): StorageModuleConfig => {
        const config: StorageModuleConfig = {
            collections: {
                [this.options.collectionName]: {
                    version: this.options.versions.initial,
                    fields: {
                        createdWhen: { type: 'timestamp' },
                        action: { type: 'json' },
                    },
                    indices: [{ field: 'createdWhen' }],
                    backup: false,
                    watch: false,
                },
            },
            operations: {
                createAction: {
                    operation: 'createObject',
                    collection: this.options.collectionName,
                },
                getOldestAction: {
                    operation: 'findObject',
                    collection: this.options.collectionName,
                    args: [{}, { order: [['createdWhen', 'asc']] }],
                },
                deleteActionById: {
                    operation: 'deleteObject',
                    collection: this.options.collectionName,
                    args: { id: '$actionId' },
                },
            },
        }
        return config
    }

    async queueAction(params: {
        action: Action
    }): Promise<{ actionId: number }> {
        const { object } = await this.operation('createAction', {
            createdWhen: '$now',
            ...params,
        })
        return { actionId: object.id }
    }

    async peekAction(): Promise<
        (Action & { id: number }) | null
    > {
        const firstAction = await this.operation('getOldestAction', {})
        return firstAction
            ? {
                id: firstAction.id,
                ...firstAction.action,
            }
            : null
    }

    async removeAction(params: { actionId: number }) {
        await this.operation('deleteActionById', params)
    }
}
