import type { ReadwiseAPI, ReadwiseHighlight } from './types'
import { READWISE_API_URL } from './constants'

export class HTTPReadwiseAPI implements ReadwiseAPI {
    constructor(
        private options: {
            fetch: typeof fetch
        },
    ) {}

    postHighlights: ReadwiseAPI['postHighlights'] = async (key, highlights) => {
        const response = await this.options.fetch(READWISE_API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Token ${key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                highlights: highlights.map((highlight) => ({
                    ...highlight,
                    highlighted_at: highlight.highlighted_at.toISOString(),
                })),
            }),
        })
        return { success: response.status === 200 }
    }

    validateKey: ReadwiseAPI['validateKey'] = async (key) => {
        const response = await this.options.fetch(READWISE_API_URL, {
            method: 'GET',
            headers: {
                Authorization: `Token ${key}`,
                'Content-Type': 'application/json',
            },
        })
        return { success: response.status === 200 || response.status === 204 }
    }
}
