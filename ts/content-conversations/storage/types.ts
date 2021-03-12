import { UserReference } from '../../web-interface/types/users';
import { SharedAnnotationReference } from '../../content-sharing/types';
import { ConversationReply } from '../../web-interface/types/storex-generated/content-conversations';
import { ConversationReplyReference } from '../types';

export interface CreateConversationReplyParams {
    userReference: UserReference;
    previousReplyReference: ConversationReplyReference | null
    pageCreatorReference: UserReference;
    annotationReference: SharedAnnotationReference;
    normalizedPageUrl: string;
    reply: Omit<ConversationReply, 'createdWhen' | 'normalizedPageUrl'>;
}
