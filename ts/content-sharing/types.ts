import { StorageReference } from '../storage/references'

export { SharedList, SharedListEntry, SharedPageInfo, SharedAnnotation, SharedAnnotationListEntry } from '../web-interface/types/storex-generated/content-sharing'

export type SharedListReference = StorageReference<'shared-list-reference'>
export type SharedPageInfoReference = StorageReference<'shared-page-info-reference'>
export type SharedAnnotationReference = StorageReference<'shared-annotation-reference'>
export type SharedAnnotationListEntryReference = StorageReference<'shared-annotation-list-entry-reference'>
