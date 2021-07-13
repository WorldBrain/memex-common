import StorageManager from '@worldbrain/storex'
import type { StorageOperationEvent } from '@worldbrain/storex-middleware-change-watcher/lib/types'
import type { ReadwiseHighlight, ReadwiseAPI } from '../api/types'
import { HTTPReadwiseAPI } from '../api'
import { DownloadStorageUtils } from 'src/personal-cloud/backend/translation-layer/storage-utils'
import {
    PersonalReadwiseAction as RawPersonalReadwiseAction,
    PersonalAnnotation,
    PersonalTagConnection,
    PersonalTag,
    PersonalAnnotationSelector,
    PersonalMemexExtensionSetting,
} from '../../web-interface/types/storex-generated/personal-cloud'
import { cloudDataToReadwiseHighlight } from '../utils'
import { EXTENSION_SETTINGS_NAME } from 'src/extension-settings/constants'

type PersonalReadwiseAction = RawPersonalReadwiseAction & {
    id: string | number
    user: string | number
    createdByDevice: string | number
    personalAnnotation: string | number
}

export interface Dependencies {
    storageManager: StorageManager
    fetch: typeof fetch
    getAPIKey: () => Promise<string>
}

export class ReadwisePostStorageChange {
    private readwiseAPI: ReadwiseAPI
    private storageUtils: DownloadStorageUtils

    constructor(private options: Dependencies) {
        this.readwiseAPI = new HTTPReadwiseAPI({ fetch: options.fetch })
    }

    private captureError = (error: Error) => {
        // TODO: Some kind of error tracking
    }

    private async getAPIKey(): Promise<string | null> {
        const settingsRecord = await this.storageUtils.findOne<
            PersonalMemexExtensionSetting
        >('personalMemexExtensionSetting', {
            name: EXTENSION_SETTINGS_NAME.ReadwiseAPIKey,
        })

        return typeof settingsRecord?.value === 'string'
            ? settingsRecord.value
            : null
    }

    async handlePostStorageChange(event: StorageOperationEvent<'post'>) {
        const readwiseAPIKey = await this.getAPIKey()
        if (readwiseAPIKey == null) {
            return
        }

        const readwiseActionChangePks = event.info.changes
            .filter(
                (change) =>
                    change.collection === 'personalReadwiseAction' &&
                    change.type === 'create' &&
                    change.pk != null,
            )
            .map((change) => change.pk)

        const records = (await this.options.storageManager
            .collection('personalReadwiseAction')
            .findObjects({
                id: { $in: readwiseActionChangePks },
            })) as PersonalReadwiseAction[]

        if (!records.length) {
            return
        }

        let highlights: ReadwiseHighlight[] = []
        for (const action of records) {
            highlights.push(await this.readwiseActionToHighlight(action))
        }

        highlights = highlights.filter((h) => h != null)

        if (highlights.length) {
            await this.readwiseAPI.postHighlights(readwiseAPIKey, highlights)
        }
    }

    private async readwiseActionToHighlight(
        readwiseAction: PersonalReadwiseAction,
    ): Promise<ReadwiseHighlight | null> {
        await this.options.storageManager
            .collection('personalReadwiseAction')
            .deleteOneObject({ id: readwiseAction.id })

        this.storageUtils = new DownloadStorageUtils({
            storageManager: this.options.storageManager,
            userId: readwiseAction.user,
        })

        const annotation = await this.storageUtils.findOne<
            PersonalAnnotation & {
                id: string | number
                personalContentMetadata: number | string
            }
        >('personalAnnotation', { id: readwiseAction.personalAnnotation })
        if (!annotation) {
            return null
        }

        const selector = await this.storageUtils.findOne<
            PersonalAnnotationSelector
        >('personalAnnotationSelector', { personalAnnotation: annotation.id })
        const {
            metadata,
            locator,
        } = await this.storageUtils.findLocatorForMetadata(
            annotation.personalContentMetadata,
        )
        if (!metadata || !locator) {
            return null
        }

        const tagConnections = await this.storageUtils.findMany<
            PersonalTagConnection & { personalTag: string | number }
        >('personalTagConnection', {
            collection: 'personalAnnotation',
            objectId: annotation.id,
        })
        const tags = await this.storageUtils.findMany<PersonalTag>(
            'personalTag',
            {
                id: { $in: tagConnections.map((conn) => conn.personalTag) },
            },
        )

        return cloudDataToReadwiseHighlight({
            annotation,
            selector,
            metadata,
            locator,
            tags,
        })
    }
}
