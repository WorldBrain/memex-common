import { ConversationReplyReference } from '../types'
import { CreateConversationReplyParams } from '../storage/types'

export interface ContentConversationsServiceInterface {
    submitReply: (
        params: Omit<CreateConversationReplyParams, 'userReference'>,
    ) => Promise<
        | { status: 'success'; replyReference: ConversationReplyReference }
        | { status: 'not-authenticated' }
    >
}
