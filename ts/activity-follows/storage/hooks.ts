import { makeStorageReference } from "../../storage/references";
import { StorageHooks } from "../../storage/hooks/types";
import { ActivityFollow } from "./types";

export const ACTIVITIY_FOLLOWS_HOOKS: StorageHooks = {
    processNewActivityFollow: {
        collection: 'activityFollow',
        operation: 'create',
        numberOfGroups: 0,
        userField: 'user',
        function: async context => {
            const follow: ActivityFollow = await context.getObject()
            const entity = makeStorageReference(follow.collection, follow.objectId)
            await context.services.activityStreams.followEntity({
                entityType: follow.collection,
                entity,
                feeds: { home: true },
            } as any)
        }
    }
}