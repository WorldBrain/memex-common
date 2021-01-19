import { UserReference } from "../../web-interface/types/users";
import { ActivityStreamsService } from "../../activity-streams/types";

export type StorageHookOperation = 'create' | 'delete';

export interface StorageHook {
    collection: string
    operation: StorageHookOperation
    numberOfGroups: number
    function: (context: StorageHookContext) => Promise<void>
}

export type StorageHooks = { [name: string]: StorageHook }

export interface StorageHookContext {
    services: {
        activityStreams: ActivityStreamsService
    }
    collection: string
    objectId: number | string
    getObject: () => Promise<any>
    operation: StorageHookOperation
    userReference?: UserReference | null
}
