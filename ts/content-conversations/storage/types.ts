import type { UserReference } from '../../web-interface/types/users'
import type { SharedAnnotationReference } from '../../content-sharing/types'
import type {
    ConversationReply,
    ConversationThread,
} from '../../web-interface/types/storex-generated/content-conversations'
import type { ConversationReplyReference } from '../types'

export interface CreateConversationReplyParams {
    userReference: UserReference
    previousReplyReference: ConversationReplyReference | null
    pageCreatorReference: UserReference
    annotationReference: SharedAnnotationReference
    normalizedPageUrl: string
    reply: Omit<ConversationReply, 'createdWhen' | 'normalizedPageUrl'>
}

export interface PreparedAnnotationReply {
    reference: ConversationReplyReference
    previousReply: ConversationReplyReference | null
    reply: ConversationReply
    sharedAnnotation: SharedAnnotationReference
    userReference: UserReference
}

export type PreparedAnnotationReplies = {
    [annotationId: string]: PreparedAnnotationReply[]
}

export interface PreparedThread {
    thread: ConversationThread
    sharedAnnotation: SharedAnnotationReference
}
