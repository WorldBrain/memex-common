import { StorageHooks } from "../../storage/hooks/types";
import { ConversationReplyReference } from "../types";
import { SharedAnnotationReference } from "../../content-sharing/types";
import { ConversationReply } from "src/web-interface/types/storex-generated/content-conversations";

export const CONTENT_CONVERSATIONS_HOOKS: StorageHooks = {
    processReplyCreation: {
        collection: 'conversationReply',
        operation: 'create',
        userField: 'user',
        numberOfGroups: 1,
        function: async context => {
            console.log(context)
            if (1) { return }
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
