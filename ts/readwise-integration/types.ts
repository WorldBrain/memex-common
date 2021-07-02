import { ReadwiseHighlight } from './api/types'

export type ReadwiseAction = ReadwisePostHighlightsAction

export interface ReadwisePostHighlightsAction {
    type: 'post-highlights'
    highlights: ReadwiseHighlight[]
}
