import StorageManager from '@worldbrain/storex'
import createResolvable from '@josephg/resolvable'
import { PersonalDataChange } from '../../web-interface/types/storex-generated/personal-cloud'
import {
    PersonalCloudBackend,
    PersonalCloudUpdateBatch,
    PersonalCloudUpdateType,
    ClientStorageType,
    PersonalCloudObjectInfo,
    MediaChangeInfo,
} from './types'
import { uploadClientUpdates, downloadClientUpdates } from './translation-layer'
import { DataChangeType } from '../storage/types'

export class StorexPersonalCloudBackend implements PersonalCloudBackend {
    constructor(
        public options: {
            storageManager: StorageManager,
            clientSchemaVersion: Date,
            view: PersonalCloudView
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
        await this.options.view.pushUpdates(updates)
        return { clientInstructions }
    }

    async *streamUpdates(): AsyncIterableIterator<PersonalCloudUpdateBatch> {
        const userId = await this.options.getUserId()
        if (!userId) {
            throw new Error(`User tried to push update without being logged in`)
        }

        if (!this.options.useDownloadTranslationLayer) {
            yield* this.options.view.streamObjects()
            return
        }

        let lastSeen = 0
        for await (const batch of this.options.view.streamObjects()) {
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

    async uploadToMedia(params: {
        deviceId: number | string,
        mediaPath: string,
        mediaObject: string | Blob
        changeInfo: MediaChangeInfo,
    }): Promise<void> {
        const userId = await this.options.getUserId()
        if (!userId) {
            throw new Error(`User tried to upload to storage without being logged in`)
        }

        const { storedObjects } = this.options.view.hub
        const existingIndex = storedObjects.findIndex(entry => entry.path === params.mediaPath)
        if (existingIndex >= 0) {
            storedObjects[existingIndex].object = params.mediaObject
        } else {
            storedObjects.push({
                path: params.mediaPath,
                object: params.mediaObject,
            })
        }

        const dataChange: PersonalDataChange = {
            type: DataChangeType.Modify,
            createdWhen: '$now' as any,
            collection: ':media',
            objectId: params.mediaPath,
            info: params.changeInfo,
        }
        await this.options.storageManager.collection('personalDataChange').createObject({
            ...dataChange,
            user: userId,
            createdByDevice: params.deviceId,
        })
        await this.options.view.pushUpdates([{
            type: PersonalCloudUpdateType.Overwrite,
            collection: ':storage',
            object: { nope: 'this is a media change, use the download translation layer' },
        }])
    }

    async downloadFromMedia(params: {
        path: string
    }): Promise<string | Blob | null> {
        return this.options.view.hub.storedObjects.find(entry => entry.path === params.path)?.object ?? null
    }
}

export class PersonalCloudView {
    nextObjects = createResolvable<PersonalCloudUpdateBatch>()

    constructor(public hub: PersonalCloudHub, public id: number) { }

    async pushUpdates(updates: PersonalCloudUpdateBatch) {
        this.hub.pushUpdates(this.id, updates)
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

export class PersonalCloudHub {
    storedObjects: Array<{ path: string, object: Blob | string }> = []
    _generatedIds = 0
    _views: PersonalCloudView[] = []

    getView(): PersonalCloudView {
        const source = new PersonalCloudView(
            this,
            ++this._generatedIds,
        )
        this._views.push(source)
        return source
    }

    pushUpdates(sourceId: number, updates: PersonalCloudUpdateBatch) {
        for (const view of this._views) {
            if (view.id !== sourceId) {
                view.receiveUpdates(updates)
            }
        }
    }
}
