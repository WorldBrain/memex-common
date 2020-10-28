import { UserReference } from '../../web-interface/types/users';
import { SharedAnnotationReference } from '../../content-sharing/types';
import { ConversationReply } from '../../web-interface/types/storex-generated/content-conversations';

export interface CreateConversationReplyParams {
    userReference: UserReference;
    pageCreatorReference: UserReference;
    annotationReference: SharedAnnotationReference;
    normalizedPageUrl: string;
    reply: Omit<ConversationReply, 'createdWhen' | 'normalizedPageUrl'>;
}
