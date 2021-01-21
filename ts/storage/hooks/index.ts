import { StorageHooks } from "./types";
import { CONTENT_CONVERSATIONS_HOOKS } from "../../content-conversations/storage/hooks";
import { ACTIVITIY_FOLLOWS_HOOKS } from "../../activity-follows/storage/hooks";
import { CONTENT_SHARING_HOOKS } from "../../content-sharing/storage/hooks";

export const STORAGE_HOOKS: StorageHooks = {
    ...CONTENT_SHARING_HOOKS,
    ...CONTENT_CONVERSATIONS_HOOKS,
    ...ACTIVITIY_FOLLOWS_HOOKS,
}