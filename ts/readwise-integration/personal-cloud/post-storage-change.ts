import StorageManager from '@worldbrain/storex'
import type {
    StorageOperationEvent,
    StorageChange,
} from '@worldbrain/storex-middleware-change-watcher/lib/types'
import type { ReadwiseHighlight, ReadwiseAPI } from '../api/types'
import { HTTPReadwiseAPI } from '../api'
import { isUrlForAnnotation } from 'src/personal-cloud/backend/translation-layer/utils'
import ActionQueue from 'src/action-queue'

export interface Dependencies {
    storageManager: StorageManager
    fetch: typeof fetch
}

export class ReadwisePostStorageChange {
    private readwiseAPI: ReadwiseAPI
    // TODO: properly type and setup action queue here
    private actionQueue: ActionQueue<any>

    constructor(private options: Dependencies) {
        this.readwiseAPI = new HTTPReadwiseAPI({ fetch: options.fetch })
    }

    private static filterNullChanges = (
        change: StorageChange<'post'>,
    ): boolean =>
        change.type === 'create' ? !!change.pk : !!change.pks?.length

    private captureError = (error: Error) => {
        // TODO: Some kind of error tracking
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
