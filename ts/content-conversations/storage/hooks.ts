import { StorageHooks } from "../../storage/hooks/types";
import { ConversationReplyReference, ConversationThreadReference } from "../types";
import { SharedAnnotationReference } from "../../content-sharing/types";
import { ConversationReply } from "../../web-interface/types/storex-generated/content-conversations";

export const CONTENT_CONVERSATIONS_HOOKS: StorageHooks = {
    processReplyCreation: {
        collection: 'conversationReply',
        operation: 'create',
        userField: 'user',
        numberOfGroups: 1,
        function: async context => {
            try {
                const replyReference: ConversationReplyReference = { type: 'conversation-reply-reference', id: context.objectId }
                const reply: ConversationReply & { conversationThread: number | string, sharedAnnotation: number | string } = await context.getObject()
                const threadReference: ConversationThreadReference = { type: 'conversation-thread-reference', id: reply.conversationThread }
                const annotationReference: SharedAnnotationReference = { type: 'shared-annotation-reference', id: reply.sharedAnnotation }
                await context.services.activityStreams.addActivity({
                    entityType: 'conversationThread',
                    entity: threadReference,
                    activityType: 'conversationReply',
                    activity: {
                        annotationReference,
                        replyReference,
                    },
                    follow: { home: true },
                })
            } catch (err) {
                console.error(err)
            }
        }
    }
}
