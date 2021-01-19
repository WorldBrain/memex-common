import { StorageHooks } from "../../storage/hooks/types";
import { ConversationReplyReference } from "../types";
import { SharedAnnotationReference } from "../../content-sharing/types";

export const CONTENT_CONVERSATIONS_HOOKS: StorageHooks = {
    processReplyCreation: {
        collection: 'conversationReply',
        operation: 'create',
        numberOfGroups: 1,
        function: async context => {
            try {
                const annotationReference: SharedAnnotationReference = { type: 'shared-annotation-reference', id: context.objectId }
                const replyReference: ConversationReplyReference = { type: 'conversation-reply-reference', id: context.objectId }
                await context.services.activityStreams.addActivity({
                    entityType: 'sharedAnnotation',
                    entity: annotationReference,
                    activityType: 'conversationReply',
                    activity: {
                        replyReference,
                        isFirstReply: false,
                    },
                    follow: { home: true },
                })
            } catch (err) {
                console.error(err)
            }
        }
    }
}
