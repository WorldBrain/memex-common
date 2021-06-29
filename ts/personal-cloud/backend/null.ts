import {
    PersonalCloudBackend,
    PersonalCloudUpdateBatch,
    PersonalCloudObjectInfo,
} from './types'

export class NullPersonalCloudBackend implements PersonalCloudBackend {
    constructor() { }

    pushUpdates: PersonalCloudBackend['pushUpdates'] = async (updates) => {
        return { clientInstructions: [] }
    }

    async *streamUpdates(): AsyncIterableIterator<PersonalCloudUpdateBatch> {
        await new Promise(() => { })
    }

    async uploadToStorage(params: { path: string, object: string | Blob }): Promise<void> {

    }
}
