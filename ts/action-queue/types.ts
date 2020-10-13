export interface ActionQueueStorageVersions {
    initial: Date
}

export type ActionQueueInteraction =
    | 'queue-and-await'
    | 'queue-and-return'
    | 'skip-queue'

export type ActionExecutor<Action> = (params: { action: Action }) => Promise<void>
export type ActionValidator<Action> = (params: { action: Action }) => ActionValidatorResult
export type ActionValidatorResult = {
    valid: boolean
    message?: string
}
