import { AutoPkStorageReference } from '../storage/references'

export { ConversationThread, ConversationReply } from '../web-interface/types/storex-generated/content-conversations'

export type ConversationThreadReference = AutoPkStorageReference<'conversation-thread-reference'>
export type ConversationReplyReference = AutoPkStorageReference<'conversation-reply-reference'>
