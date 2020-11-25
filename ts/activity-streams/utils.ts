import pick from 'lodash/pick'
import { ActivityStream, ActivityRequest, EntitityActivities, ActivityResult, AnnotationReplyActivity } from "./types";
import ContentConversationStorage from "../content-conversations/storage";
import ContentSharingStorage from "../content-sharing/storage";
import { SharedAnnotationReference } from '../content-sharing/types';
import UserStorage from '../user-management/storage';

export async function concretizeActivity<EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>>(params: {
    storage: {
        contentSharing: Pick<ContentSharingStorage, 'getAnnotation' | 'getPageInfoByCreatorAndUrl'>,
        contentConversations: Pick<ContentConversationStorage, 'getReply'>,
        users: Pick<UserStorage, 'getUser'>
    }
    entityType: EntityType
    entity: ActivityStream[EntityType]['entity'],
} & ActivityRequest<EntityType, ActivityType>): Promise<ActivityResult<EntityType, ActivityType>> {
    if (params.entityType === 'sharedAnnotation' && params.activityType === 'conversationReply') {
        const activityRequest = params.activity as AnnotationReplyActivity['request']
        const replyData = await params.storage.contentConversations.getReply({
            annotationReference: params.entity as SharedAnnotationReference,
            replyReference: activityRequest.replyReference,
        })
        if (!replyData) {
            throw new Error(`Could not concrectize annotation reply activity: reply not found`)
        }
        const annotation = await params.storage.contentSharing.getAnnotation({
            reference: replyData.sharedAnnotation,
        })
        if (!annotation) {
            throw new Error(`Could not concrectize annotation reply activity: annotation not found`)
        }
        const { pageInfo, reference: pageInfoReference } = await params.storage.contentSharing.getPageInfoByCreatorAndUrl({
            normalizedUrl: replyData.reply.normalizedPageUrl,
            creatorReference: annotation.creatorReference,
        })
        if (!pageInfo) {
            throw new Error(`Could not concrectize annotation reply activity: page info not found`)
        }
        const annotationCreator = await params.storage.users.getUser(annotation.creatorReference)
        const replyCreator = await params.storage.users.getUser(replyData.userReference)

        const activity: AnnotationReplyActivity['result'] = {
            normalizedPageUrl: replyData.reply.normalizedPageUrl,
            pageInfo: {
                reference: pageInfoReference,
                ...pageInfo,
            },
            replyCreator: {
                reference: replyData.userReference,
                ...replyCreator
            },
            reply: {
                reference: activityRequest.replyReference,
                ...replyData.reply
            },
            annotationCreator: {
                reference: annotation.creatorReference,
                ...annotationCreator,
            },
            annotation: {
                reference: replyData.sharedAnnotation,
                ...annotation.annotation,
            },
        }
        return {
            activityType: params.activityType,
            activity,
        }
    }

    throw new Error(`Tried to concretize unknown activity: ${params.entityType}, ${params.activityType}`)
}
