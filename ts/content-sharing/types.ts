import * as storexGenerated from '../web-interface/types/storex-generated/content-sharing'

export type SharedList = storexGenerated.SharedList
export type SharedListEntry = storexGenerated.SharedListEntry
export interface SharedListReference {
    type: 'shared-list-reference'
}

export type SharedAnnotation = storexGenerated.SharedAnnotation
export interface SharedAnnotationReference {
    type: 'shared-annotation-reference'
}

export type SharedAnnotationListEntry = storexGenerated.SharedAnnotationListEntry
export interface SharedAnnotationListEntryReference {
    type: 'shared-annotation-list-entry-reference'
}
