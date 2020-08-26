import * as storexGenerated from '../web-interface/types/storex-generated/content-sharing'

export type SharedList = storexGenerated.SharedList
export interface SharedListReference {
    type: 'shared-list-reference'
}
export type SharedListEntry = storexGenerated.SharedListEntry

export type SharedPageInfo = storexGenerated.SharedPageInfo
export interface SharedPageInfoReference {
    type: 'shared-page-info-reference'
}

export type SharedAnnotation = storexGenerated.SharedAnnotation
export interface SharedAnnotationReference {
    type: 'shared-annotation-reference'
}

export type SharedAnnotationListEntry = storexGenerated.SharedAnnotationListEntry
export interface SharedAnnotationListEntryReference {
    type: 'shared-annotation-list-entry-reference'
}
