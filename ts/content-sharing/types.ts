import * as storexGenerated from '../web-interface/types/storex-generated/content-sharing'

export type SharedList = storexGenerated.SharedList
export type SharedListEntry = storexGenerated.SharedListEntry
export interface SharedListReference {
    type: 'shared-list-reference'
}

export type SharedAnnotation = storexGenerated.SharedAnnotation
export type SharedAnnotationListEntry = storexGenerated.SharedAnnotationListEntry
export interface SharedAnnotationReference {
    type: 'shared-annotation-reference'
}
