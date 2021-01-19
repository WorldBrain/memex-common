import { StorageHooks } from "./types";
import { CONTENT_CONVERSATIONS_HOOKS } from "../../content-conversations/storage/hooks";

export const STORAGE_HOOKS: StorageHooks = {
    ...CONTENT_CONVERSATIONS_HOOKS,
}