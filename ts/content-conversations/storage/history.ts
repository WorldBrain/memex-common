import { CollectionDefinition } from "@worldbrain/storex"
import { STORAGE_VERSIONS } from "../../web-interface/storage/versions"

const CONTENT_THREAD_HISTORY: CollectionDefinition[] = [
    {
        version: STORAGE_VERSIONS[3].date,
        fields: {
            updatedWhen: { type: 'timestamp' },
            normalizedPageUrl: { type: 'string' },
        },
        relationships: [
            { childOf: 'user', alias: 'pageCreator' },
            { childOf: 'sharedAnnotation' },
        ],
    }
]

const CONTENT_REPLY_HISTORY: CollectionDefinition[] = [
    {
        version: STORAGE_VERSIONS[3].date,
        fields: {
            createdWhen: { type: 'timestamp' },
            normalizedPageUrl: { type: 'string' },
            content: { type: 'string' }
        },
        relationships: [
            { childOf: 'user' },
            { childOf: 'user', alias: 'pageCreator' },
            { childOf: 'sharedAnnotation' },
        ],
        groupBy: [
            { subcollectionName: 'replies', key: 'sharedAnnotation' }
        ],
    }
]

export const CONTENT_CONVERSATIONS_HISTORY = {
    contentThread: CONTENT_THREAD_HISTORY,
    contentReply: CONTENT_REPLY_HISTORY,
}
