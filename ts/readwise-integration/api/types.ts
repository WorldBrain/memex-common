export interface ReadwiseAPI {
    validateKey: (key: string) => Promise<ReadwiseAPIResponse>
    postHighlights: (
        key: string,
        highlights: ReadwiseHighlight[],
    ) => Promise<ReadwiseAPIResponse>
}

export interface ReadwiseHighlight {
    /** Page title */
    title: string
    /** Full URL of the page */
    source_url: string
    source_type: 'article'
    /** Annotation body */
    text: string
    /** Annotation comment */
    note: string
    location: number
    location_type: 'time_offset' | 'page' | 'order'
    highlighted_at: Date
    /** URL the user can use to jump directly to annotation */
    highlight_url?: string
}

export interface ReadwiseAPIResponse {
    success: boolean
}
