import {
    PersonalCloudBackend,
    PersonalCloudUpdateBatch,
} from './types'

export class NullPersonalCloudBackend implements PersonalCloudBackend {
    constructor() { }

    pushUpdates: PersonalCloudBackend['pushUpdates'] = async (updates) => {
        return { clientInstructions: [] }
    }

    async *streamUpdates(): AsyncIterableIterator<PersonalCloudUpdateBatch> {
        await new Promise(() => { })
    }

    async uploadToMedia(params: {}): Promise<void> {

    }

    async downloadFromMedia(params: {
        path: string
    }): Promise<string | Blob | null> {
        return null
    }
}
