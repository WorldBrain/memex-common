import { AutoPkStorageReference } from '../storage/references'

import * as generated from '../web-interface/types/storex-generated/content-sharing'
export { SharedList, SharedListEntry, SharedPageInfo, SharedAnnotation, SharedAnnotationListEntry } from '../web-interface/types/storex-generated/content-sharing'

export type SharedListReference = AutoPkStorageReference<'shared-list-reference'>
export type SharedListEntryReference = AutoPkStorageReference<'shared-list-entry-reference'>
export type SharedPageInfoReference = AutoPkStorageReference<'shared-page-info-reference'>
export type SharedAnnotationReference = AutoPkStorageReference<'shared-annotation-reference'>
export type SharedAnnotationListEntryReference = AutoPkStorageReference<'shared-annotation-list-entry-reference'>

export type SharedListRole = generated.SharedListRole & { roleID: SharedListRoleID }
export type SharedListRoleReference = AutoPkStorageReference<'shared-list-role-reference'>
export type SharedListKey = generated.SharedListKey & { roleID: SharedListRoleID }
export type SharedListKeyReference = AutoPkStorageReference<'shared-list-key-reference'>


export enum SharedListRoleID {
    Reader = 100,
    SuggestOnly = 200,
    AddOnly = 400,
    ReadWrite = 800,
    Admin = 900,
    Owner = 1000,
}
