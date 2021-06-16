import {
    StorageModule,
    StorageModuleConstructorArgs,
    StorageModuleConfig,
} from '@worldbrain/storex-pattern-modules'
import { PersonalDeviceInfo } from '../../web-interface/types/storex-generated/personal-cloud'
import { PERSONAL_CLOUD_STORAGE_COLLECTIONS } from './collections'
import { PERSONAL_CLOUD_OPERATIONS } from './operations'
import { PERSONAL_CLOUD_STORAGE_ACCESS_RULES } from './access-rules'

export default class PersonalCloudStorage extends StorageModule {
    constructor(
        private options: StorageModuleConstructorArgs & {
            autoPkType: 'number' | 'string'
        },
    ) {
        super(options)
    }

    getConfig = (): StorageModuleConfig => {
        const collections = PERSONAL_CLOUD_STORAGE_COLLECTIONS()
        const accessRules = PERSONAL_CLOUD_STORAGE_ACCESS_RULES(collections)
        return {
            collections,
            operations: PERSONAL_CLOUD_OPERATIONS,
            accessRules,
        };
    }

    async createDeviceInfo(params: { userId: number | string, device: Omit<PersonalDeviceInfo, 'createdWhen' | 'updatedWhen'> }): Promise<{ id: number | string }> {
        const { object } = await this.operation('createDeviceInfo', {
            ...params.device,
            user: params.userId,
            createdWhen: '$now',
            updatedWhen: '$now',
        })

        return { id: object.id }
    }
}
