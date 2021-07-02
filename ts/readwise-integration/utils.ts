import type {
    PersonalAnnotation,
    PersonalContentMetadata,
    PersonalTag,
    PersonalContentLocator,
    PersonalAnnotationSelector,
} from '../web-interface/types/storex-generated/personal-cloud'
import type { ReadwiseHighlight } from './api/types'
import type { Anchor } from '../annotations/types'
import { getAnchorSelector } from '../annotations/utils'

interface RequiredHighlightData {
    metadata: PersonalContentMetadata
    locator: PersonalContentLocator
    annotation: PersonalAnnotation
    tags: PersonalTag[]
    selector?: PersonalAnnotationSelector
}

export function cloudDataToReadwiseHighlight({
    annotation,
    metadata,
    selector,
    locator,
    tags,
}: RequiredHighlightData): ReadwiseHighlight {
    return {
        title: metadata.title,
        source_url: locator.originalLocation,
        source_type: 'article',
        note: formatReadwiseHighlightNote(
            annotation.comment,
            tags.map((tag) => tag.name),
        ),
        highlighted_at: new Date(annotation.createdWhen),
        text: formatReadwiseHighlightText(annotation.body),
        location_type: 'order',
        location: formatReadwiseHighlightLocation(selector.selector),
    }
}

export const formatReadwiseHighlightNote = (
    comment: string = '',
    tags: string[] = [],
): string => {
    if (!comment.length && !tags.length) {
        return undefined
    }

    let text = ''
    if (tags.length) {
        text += '.' + tags.join(' .') + '\n'
    }

    if (comment.length) {
        text += comment
    }

    return text
}

export const formatReadwiseHighlightText = (
    annotationBody?: string,
    now = new Date(),
) => {
    if (annotationBody?.length) {
        return annotationBody
    }

    const date =
        now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate()
    const time =
        now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds()
    const dateTime = date + ' ' + time
    return 'Memex note from: ' + dateTime
}

export const formatReadwiseHighlightLocation = (
    anchor?: Anchor,
): number | undefined =>
    anchor ? getAnchorSelector(anchor, 'TextPositionSelector').start : undefined
