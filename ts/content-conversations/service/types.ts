import { ConversationReplyReference } from '../types'
import { CreateConversationReplyParams } from '../storage/types'

export type CreateReplyResult =
    | { status: 'success'; replyReference: ConversationReplyReference }
    | { status: 'failure'; error?: Error }
    | { status: 'not-authenticated' }

export interface ContentConversationsServiceInterface {
    submitReply: (
        params: Omit<CreateConversationReplyParams, 'userReference'>,
    ) => Promise<CreateReplyResult>
}
