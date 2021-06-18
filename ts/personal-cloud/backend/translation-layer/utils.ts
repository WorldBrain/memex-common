export const extractIdFromAnnotationUrl = (
    annotationUrl: string,
): string | null => annotationUrl.split('#')[1] ?? null
