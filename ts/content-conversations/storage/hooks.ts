import { StorageHooks } from "../../storage/hooks/types";
import { ConversationReplyReference } from "../types";
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
                const reply: ConversationReply & { sharedAnnotation: number | string } = await context.getObject()
                const annotationReference: SharedAnnotationReference = { type: 'shared-annotation-reference', id: reply.sharedAnnotation }
                await context.services.activityStreams.addActivity({
                    entityType: 'sharedAnnotation',
                    entity: annotationReference,
                    activityType: 'conversationReply',
                    activity: {
                        replyReference,
                        previousReplyReference: null, // TODO: figure out how to get the prev reply reference
                    },
                    follow: { home: true },
                })
            } catch (err) {
                console.error(err)
            }
        }
    }
}
