import { AutoPkStorageReference } from '../storage/references'

export { SharedList, SharedListEntry, SharedPageInfo, SharedAnnotation, SharedAnnotationListEntry } from '../web-interface/types/storex-generated/content-sharing'

export type SharedListReference = AutoPkStorageReference<'shared-list-reference'>
export type SharedPageInfoReference = AutoPkStorageReference<'shared-page-info-reference'>
export type SharedAnnotationReference = AutoPkStorageReference<'shared-annotation-reference'>
export type SharedAnnotationListEntryReference = AutoPkStorageReference<'shared-annotation-list-entry-reference'>
