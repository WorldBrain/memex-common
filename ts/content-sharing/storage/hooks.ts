import { makeStorageReference } from "../../storage/references";
import { StorageHooks } from "../../storage/hooks/types";
import { SharedListEntry } from "../../web-interface/types/storex-generated/content-sharing";
import { SharedListReference, SharedListEntryReference } from "../types";

export const CONTENT_SHARING_HOOKS: StorageHooks = {
    processNewListEntry: {
        collection: 'sharedListEntry',
        operation: 'create',
        numberOfGroups: 0,
        userField: 'creator',
        function: async context => {
            const listEntry: SharedListEntry & { id: number | string, sharedList: number | string } = await context.getObject()
            const listReference = makeStorageReference<SharedListReference>('shared-list-reference', listEntry.sharedList)
            const entryReference = makeStorageReference<SharedListEntryReference>('shared-list-entry-reference', listEntry.id)
            await context.services.activityStreams.addActivity({
                entityType: 'sharedList',
                entity: listReference,
                activityType: 'sharedListEntry',
                activity: {
                    entryReference,
                }
            })
        }
    },
}
