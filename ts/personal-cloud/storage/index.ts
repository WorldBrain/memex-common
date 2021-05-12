import {
    StorageModule,
    StorageModuleConstructorArgs,
    StorageModuleConfig,
} from '@worldbrain/storex-pattern-modules'
import { PERSONAL_CLOUD_STORAGE_COLLECTIONS } from './collections'
import { PERSONAL_CLOUD_OPERATIONS } from './operations'
import { PERSONAL_CLOUD_STORAGE_ACCESS_RULES } from './access-rules'

export default class ContentSharingStorage extends StorageModule {
    constructor(
        private options: StorageModuleConstructorArgs & {
            autoPkType: 'number' | 'string'
        },
    ) {
        super(options)
    }

    getConfig = (): StorageModuleConfig => ({
        collections: PERSONAL_CLOUD_STORAGE_COLLECTIONS(),
        operations: PERSONAL_CLOUD_OPERATIONS,
        accessRules: PERSONAL_CLOUD_STORAGE_ACCESS_RULES,
    })
}
