import StorageManager from '@worldbrain/storex'
import type {
    StorageOperationEvent,
    StorageChange,
} from '@worldbrain/storex-middleware-change-watcher/lib/types'
import type { ReadwiseHighlight, ReadwiseAPI } from '../api/types'
import { HTTPReadwiseAPI } from '../api'
import { isUrlForAnnotation } from '../../personal-cloud/backend/translation-layer/utils'
import ActionQueue from '../../action-queue'
import { ActionExecutor } from '../../action-queue/types'
import type { ReadwiseAction } from '../types'
import { STORAGE_VERSIONS } from '../../web-interface/storage/versions'
import { READWISE_ACTION_RETRY_INTERVAL } from '../constants'

export interface Dependencies {
    storageManager: StorageManager
    fetch: typeof fetch
    getAPIKey: () => Promise<string>
}

export class ReadwisePostStorageChange {
    private readwiseAPI: ReadwiseAPI
    private actionQueue: ActionQueue<ReadwiseAction>

    constructor(private options: Dependencies) {
        this.readwiseAPI = new HTTPReadwiseAPI({ fetch: options.fetch })

        // TODO: make this cloud compatible
        this.actionQueue = new ActionQueue({
            storageManager: options.storageManager,
            collectionName: 'personalReadwiseAction',
            versions: { initial: STORAGE_VERSIONS[8].date },
            retryIntervalInMs: READWISE_ACTION_RETRY_INTERVAL,
            executeAction: this.executeAction,
        })
    }

    private static filterNullChanges = (
        change: StorageChange<'post'>,
    ): boolean =>
        change.type === 'create' ? !!change.pk : !!change.pks?.length

    private captureError = (error: Error) => {
        // TODO: Some kind of error tracking
    }

    private executeAction: ActionExecutor<ReadwiseAction> = async ({
        action,
    }) => {
        const key = await this.options.getAPIKey()

        if (action.type === 'post-highlights') {
            await this.readwiseAPI.postHighlights(key, action.highlights)
        }
    }

    async handlePostStorageChange(event: StorageOperationEvent<'post'>) {
        for (const change of event.info.changes.filter(
            ReadwisePostStorageChange.filterNullChanges,
        )) {
            if (change.collection === 'annotations') {
                await this.handleAnnotationPostStorageChange(change)
                continue
            }

            if (change.collection === 'tags') {
                await this.handleTagPostStorageChange(change)
                continue
            }
        }
    }

    private async handleAnnotationPostStorageChange(
        change: StorageChange<'post'>,
    ) {
        if (!['create', 'modify'].includes(change.type)) {
            return
        }

        const annotationUrl =
            change.type === 'create'
                ? (change.pk as string)
                : (change.pks[0] as string)
        await this.scheduleReadwiseHighlightUpdate({
            url: annotationUrl,
            ...change.values,
        })
    }

    private async handleTagPostStorageChange(change: StorageChange<'post'>) {
        if (!['create', 'delete'].includes(change.type)) {
            return
        }

        // There can only ever be tags deleted for a single annotation, so just get the URL of one
        const annotationUrl =
            change.type === 'create'
                ? (change.pk as [string, string])[1]
                : (change.pks as [string, string][])[0][1]

        if (!isUrlForAnnotation(annotationUrl)) {
            return
        }

        // TODO: get annotation + tags data
        let annotation = {}
        await this.scheduleReadwiseHighlightUpdate(annotation)
    }

    private async scheduleReadwiseHighlightUpdate(annotation) {
        try {
            // TODO: create readwise highlight from data
            const readwiseHighlight: ReadwiseHighlight = {} as any

            await this.actionQueue.scheduleAction(
                {
                    type: 'post-highlights',
                    highlights: [readwiseHighlight],
                },
                { queueInteraction: 'queue-and-return' },
            )
        } catch (e) {
            this.captureError(e)
        }
    }
}
