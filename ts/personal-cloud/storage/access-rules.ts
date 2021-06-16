import { StorageModule, AccessRules, OwnershipRules } from "@worldbrain/storex-pattern-modules";

export function PERSONAL_CLOUD_STORAGE_ACCESS_RULES(collections: StorageModule['collections']): AccessRules {
    const ownership: OwnershipRules = {}
    for (const collectionName of Object.keys(collections)) {
        ownership[collectionName] = {
            field: 'user',
            access: 'full',
        }
    }
    return { ownership }
}