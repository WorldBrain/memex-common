import { StorageHooks } from "./types";
import { CONTENT_CONVERSATIONS_HOOKS } from "../../content-conversations/storage/hooks";
import { ACTIVITIY_FOLLOWS_HOOKS } from "../../activity-follows/storage/hooks";

export const STORAGE_HOOKS: StorageHooks = {
    ...CONTENT_CONVERSATIONS_HOOKS,
    ...ACTIVITIY_FOLLOWS_HOOKS,
}