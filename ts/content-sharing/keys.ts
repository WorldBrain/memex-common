import { SharedListReference } from "./types";
import ContentSharingStorage from "./storage";
import { UserReference } from "../web-interface/types/users";
import { UserMessageService } from "../user-messages/service/types";
import ActivityFollowsStorage from "../activity-follows/storage";

export async function processListKey(params: {
    keyString: string
    listReference: SharedListReference
    userReference: UserReference
    contentSharing: ContentSharingStorage
    userMessages: UserMessageService
    activityFollows: ActivityFollowsStorage
}) {
    const { contentSharing } = params
    const key = await contentSharing.getListKey(params)
    if (!key) {
        return false
    }
    const existingRole = await contentSharing.getListRole(params)
    if (!existingRole) {
        await contentSharing.createListRole({ ...params, roleID: key.roleID })
    } else if (existingRole.roleID < key.roleID) {
        await contentSharing.updateListRole({ ...params, roleID: key.roleID })
    }
    if (!existingRole) {
        await params.activityFollows.storeFollow({
            collection: 'sharedList',
            objectId: params.listReference.id as string,
            userReference: params.userReference,
        })
    }
    await params.userMessages.pushMessage({ type: 'joined-collection', sharedListId: params.listReference.id })
    return true
}