import { SharedListReference, SharedListKey, SharedListRoleID } from "./types";
import ContentSharingStorage from "./storage";
import { UserReference } from "src/web-interface/types/users";

export async function processListKey(params: {
    key: string
    listReference: SharedListReference
    userReference: UserReference
    contentSharing: ContentSharingStorage
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
    return true
}
