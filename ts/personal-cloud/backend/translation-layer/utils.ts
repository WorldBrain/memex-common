import extractUrlParts from '@worldbrain/memex-url-utils/lib/extract-parts'
import type {
    PersonalContentMetadata,
    PersonalContentLocator,
    PersonalAnnotation,
    PersonalAnnotationSelector,
} from '../../../web-interface/types/storex-generated/personal-cloud'

export const extractIdFromAnnotationUrl = (
    annotationUrl: string,
): string | null => annotationUrl.split('#')[1] ?? null

export const constructAnnotationUrl = (
    annotationUrl: string,
    id: string,
): string => annotationUrl + '#' + id

export function constructPageFromRemote(
    metadata: PersonalContentMetadata,
    locator: PersonalContentLocator,
) {
    const urlParts = extractUrlParts(locator.originalLocation, {
        supressParseError: false,
    })
    return {
        url: locator.location,
        fullUrl: locator.originalLocation,
        domain: urlParts.domain,
        hostname: urlParts.hostname,
        fullTitle: metadata.title,
        text: '',
        lang: metadata.lang,
        canonicalUrl: metadata.canonicalUrl,
        description: metadata.description,
    }
}

export function constructAnnotationFromRemote(
    annotation: PersonalAnnotation,
    { title }: PersonalContentMetadata,
    { location }: PersonalContentLocator,
    { selector }: PersonalAnnotationSelector = {} as PersonalAnnotationSelector,
) {
    return {
        url: constructAnnotationUrl(location, annotation.localId),
        pageUrl: location,
        pageTitle: title,
        body: annotation.body,
        comment: annotation.comment,
        createdWhen: new Date(annotation.createdWhen),
        lastEdited: new Date(annotation.updatedWhen),
        selector,
    }
}
