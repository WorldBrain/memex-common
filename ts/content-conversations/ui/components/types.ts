import {
    SharedAnnotation,
    SharedAnnotationReference,
} from '../../../content-sharing/types'

export type SharedAnnotationInPage = Pick<
    SharedAnnotation,
    'body' | 'comment' | 'createdWhen'
> & {
    reference: SharedAnnotationReference
    linkId: string
    hasThread?: boolean
}
