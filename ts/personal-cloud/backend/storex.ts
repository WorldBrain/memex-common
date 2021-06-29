import StorageManager from '@worldbrain/storex'
import createResolvable from '@josephg/resolvable'
import {
    PersonalCloudBackend,
    PersonalCloudUpdateBatch,
} from './types'
import { uploadClientUpdates, downloadClientUpdates } from './translation-layer'

export class StorexPersonalCloudBackend implements PersonalCloudBackend {
    storedObjects: Array<{ path: string, object: Blob | string }> = []

    constructor(
        public options: {
            storageManager: StorageManager,
            clientSchemaVersion: Date,
            changeSource: PersonalCloudChangeSourceView
            getUserId: () => Promise<number | string | null>
            getNow(): number
            useDownloadTranslationLayer?: boolean
        },
    ) { }

    pushUpdates: PersonalCloudBackend['pushUpdates'] = async (updates) => {
        const userId = await this.options.getUserId()
        if (!userId) {
            throw new Error(`User tried to push update without being logged in`)
        }

        const { clientInstructions } = await uploadClientUpdates({
            storageManager: this.options.storageManager,
            getNow: this.options.getNow,
            userId,
            updates,
        })
        await this.options.changeSource.pushUpdates(updates)
        return { clientInstructions }
    }

    async *streamUpdates(): AsyncIterableIterator<PersonalCloudUpdateBatch> {
        const userId = await this.options.getUserId()
        if (!userId) {
            throw new Error(`User tried to push update without being logged in`)
        }

        if (!this.options.useDownloadTranslationLayer) {
            yield* this.options.changeSource.streamObjects()
            return
        }

        let lastSeen = 0
        for await (const batch of this.options.changeSource.streamObjects()) {
            while (true) {
                const { batch, lastSeen: newLastSeen, maybeHasMore } = await downloadClientUpdates({
                    storageManager: this.options.storageManager,
                    clientSchemaVersion: this.options.clientSchemaVersion,
                    getNow: this.options.getNow,
                    userId,
                    startTime: lastSeen,
                })
                lastSeen = newLastSeen
                yield batch
                if (!maybeHasMore) {
                    break
                }
            }
        }
    }

    async uploadToStorage(params: { path: string, object: string | Blob }): Promise<void> {
        this.storedObjects.push({ ...params })
    }
}

export class PersonalCloudChangeSourceView {
    nextObjects = createResolvable<PersonalCloudUpdateBatch>()

    constructor(public bus: PersonalCloudChangeSourceBus, public id: number) { }

    pushUpdates: PersonalCloudBackend['pushUpdates'] = async (updates) => {
        this.bus.pushUpdate(this.id, updates)
        return { clientInstructions: [] }
    }

    async *streamObjects(): AsyncIterableIterator<PersonalCloudUpdateBatch> {
        while (true) {
            const nextObjects = await this.nextObjects
            yield nextObjects
        }
    }

    receiveUpdates(updates: PersonalCloudUpdateBatch) {
        const oldNextObjects = this.nextObjects
        this.nextObjects = createResolvable()
        oldNextObjects.resolve(updates)
    }
}

export class PersonalCloudChangeSourceBus {
    _generatedIds = 0
    _views: PersonalCloudChangeSourceView[] = []

    getView(): PersonalCloudChangeSourceView {
        const source = new PersonalCloudChangeSourceView(
            this,
            ++this._generatedIds,
        )
        this._views.push(source)
        return source
    }

    pushUpdate(sourceId: number, updates: PersonalCloudUpdateBatch) {
        for (const view of this._views) {
            if (view.id !== sourceId) {
                view.receiveUpdates(updates)
            }
        }
    }
}
