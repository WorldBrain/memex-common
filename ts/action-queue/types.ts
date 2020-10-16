export interface ActionQueueStorageVersions {
    initial: Date
}

export type ActionQueueInteraction =
    | 'queue-and-await'
    | 'queue-and-return'
    | 'skip-queue'

export type ActionExecutor<Action> = (params: { action: Action }) => Promise<void>
export type ActionPreprocessor<Action> = (params: { action: Action }) => ActionPreprocessorResult<Action>
export type ActionPreprocessorResult<Action> = {
    valid: false
    validationError: string
} | {
    valid: true,
    processed?: Action
}
