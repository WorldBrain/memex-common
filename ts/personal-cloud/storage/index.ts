import {
    StorageModule,
    StorageModuleConstructorArgs,
    StorageModuleConfig,
} from '@worldbrain/storex-pattern-modules'
import { PersonalDeviceInfo } from '../../web-interface/types/storex-generated/personal-cloud'
import { PERSONAL_CLOUD_STORAGE_COLLECTIONS } from './collections'
import { PERSONAL_CLOUD_OPERATIONS } from './operations'
// import { PERSONAL_CLOUD_STORAGE_ACCESS_RULES } from './access-rules'

export default class PersonalCloudStorage extends StorageModule {
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
        // accessRules: PERSONAL_CLOUD_STORAGE_ACCESS_RULES,
    })

    async createDeviceInfo(device: Omit<PersonalDeviceInfo, 'createdWhen' | 'updatedWhen'>): Promise<{ id: number | string }> {
        const { object } = await this.operation('createDeviceInfo', {
            ...device,
            createdWhen: '$now',
            updatedWhen: '$now',
        })

        return { id: object.id }
    }
}
