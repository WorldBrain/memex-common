import { SharedAnnotationListEntryReference, SharedAnnotationReference, SharedListReference, SharedAnnotation, SharedAnnotationListEntry } from "../types"
import { UserReference } from "../../web-interface/types/users"

export type GetAnnotationListEntriesElement = SharedAnnotationListEntry & {
    reference: SharedAnnotationListEntryReference
    creator: UserReference,
    sharedAnnotation: SharedAnnotationReference
    sharedList: SharedListReference,
}
export type GetAnnotationListEntriesResult = {
    [normalizedPageUrl: string]: GetAnnotationListEntriesElement[]
}
export type GetAnnotationsResult = {
    [linkId: string]: SharedAnnotation & {
        reference: SharedAnnotationReference
        creator: UserReference
        linkId: string
    }
}
