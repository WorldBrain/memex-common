export const DATE_FIELDS: { [collection: string]: Array<string> } = {
    customLists: ['createdAt'],
    pageListEntries: ['createdAt'],
    annotations: ['createdWhen', 'lastEdited'],
    annotationPrivacyLevels: ['createdWhen']
}
