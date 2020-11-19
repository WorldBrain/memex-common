import pick from 'lodash/pick'
import { ActivityStreamsService, ActivityStream, NotificationStreamResult, ActivityRequest, EntitityActivities, ActivityResult, AnnotationReplyActivity } from "./types";
import ContentConversationStorage from "src/content-conversations/storage";
import ContentSharingStorage from "src/content-sharing/storage";

export interface MemoryFollow {
    createdWhen: number
    sourceEntity: { type: string, id: string | number }
    targetEntitity: { type: string, id: string | number }
    feeds: { user: boolean, notification: boolean }
}
export interface MemoryActivity {
    id: number
    createdWhen: number
    userId: string | number
    entity: { type: string, id: string | number }
    type: string
    data: any
}

export default class MemoryStreamsService {
    follows: MemoryFollow[] = []
    activities: MemoryActivity[] = []
    notificationStates: {
        [userId: string]: {
            seen: Set<number>,
            read: Set<number>
        }
    } = {}

    private activityCounter = 0

    constructor(private options: {
        storage: {
            contentSharing: ContentSharingStorage,
            contentConversations: ContentConversationStorage,
        }
        getCurrentUserId(): Promise<number | string | null | undefined>
    }) { }

    followEntity: ActivityStreamsService['followEntity'] = async <EntityType extends keyof ActivityStream>(params: {
        entityType: EntityType
        entity: ActivityStream[EntityType]['entity']
        feeds: { user: boolean, notification: boolean }
    }): Promise<void> => {
        this.follows.push({
            createdWhen: Date.now(),
            sourceEntity: { type: 'user', id: await this.options.getCurrentUserId()! },
            targetEntitity: { type: params.entityType, id: params.entity.id },
            feeds: params.feeds
        })
    }

    addActivity: ActivityStreamsService['addActivity'] = async <EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>>(params: {
        entityType: EntityType
        entity: ActivityStream[EntityType]['entity'],
    } & ActivityRequest<EntityType, ActivityType>): Promise<void> => {
        const userId = await this.options.getCurrentUserId()
        if (!userId) {
            throw new Error(`Tried to add new activity wtihout being authenticated: ${params.entityType}, ${params.activityType}`)
        }

        const { activity } = await concretizeActivity({
            storage: this.options.storage,
            ...params
        })

        this.activities.push({
            id: ++this.activityCounter,
            createdWhen: Date.now(),
            entity: { type: params.entityType, id: params.entity.id },
            userId,
            type: params.activityType as string,
            data: activity,
        })
    }

    async getNotifications(): Promise<Array<NotificationStreamResult<keyof ActivityStream>>> {
        const userId = await this.options.getCurrentUserId()
        if (!userId) {
            throw new Error(`Tried to get notifications wtihout being authenticated`)
        }
        const userNotficationState = this.notificationStates[userId] ?? { seen: new Set(), read: new Set() }
        this.notificationStates[userId] = userNotficationState

        const getFollow = (entity: { type: string, id: string | number }) => {
            return this.follows.find(follow =>
                follow.sourceEntity.type === 'user' &&
                follow.sourceEntity.id == userId &&
                follow.targetEntitity.type === entity.type &&
                follow.targetEntitity.id === entity.id
            )
        }

        return this.activities.filter(activity => {
            const follow = getFollow(activity.entity)
            return follow && follow.createdWhen <= activity.createdWhen
        }).map(activity => {
            const seen = userNotficationState.seen.has(activity.id)
            const read = userNotficationState.read.has(activity.id)
            // TODO: TypeScript doesn't want to strongly type this
            return {
                entityType: activity.entity.type,
                entity: activity.entity,
                activityType: activity.type,
                activity: activity.data,
                seen,
                read,
            } as any
        })
    }
}

async function concretizeActivity<EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>>(params: {
    storage: { contentSharing: ContentSharingStorage, contentConversations: ContentConversationStorage }
    entityType: EntityType
    entity: ActivityStream[EntityType]['entity'],
} & ActivityRequest<EntityType, ActivityType>): Promise<ActivityResult<EntityType, ActivityType>> {
    if (params.entityType === 'annotation' && params.activityType === 'reply') {
        const activityRequest = params.activity as AnnotationReplyActivity['request']
        const replyData = await params.storage.contentConversations.getReply({
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
        const { pageInfo } = await params.storage.contentSharing.getPageInfoByCreatorAndUrl({
            normalizedUrl: replyData.reply.normalizedPageUrl,
            creatorReference: annotation.creatorReference,
        })
        if (!pageInfo) {
            throw new Error(`Could not concrectize annotation reply activity: page info not found`)
        }

        const activity: AnnotationReplyActivity['result'] = {
            normalizedPageUrl: replyData.reply.normalizedPageUrl,
            pageInfo: pick(pageInfo, 'fullTitle', 'originalUrl', 'updatedWhen'),
            replyCreator: replyData.userReference,
            replyReference: replyData.reference,
            reply: pick(replyData.reply, 'content', 'createdWhen'),
            annotationReference: replyData.sharedAnnotation,
            annotationCreator: annotation.creatorReference,
            annotation: pick(annotation.annotation, 'body', 'comment', 'updatedWhen'),
        }
        return {
            activityType: params.activityType,
            activity,
        }
    }

    throw new Error(`Tried to concretize unknow activity: ${params.entityType}, ${params.activityType}`)
}
