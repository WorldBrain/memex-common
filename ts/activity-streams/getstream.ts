import { StreamClient, NotificationActivity } from 'getstream'
import ContentSharingStorage from '../content-sharing/storage';
import ContentConversationStorage from '../content-conversations/storage';
import { ActivityStream, NotificationStreamResult, ActivityStreamsService, ActivityRequest, EntitityActivities, AnnotationReplyActivity, ActivityResult } from "./types";

export default class GetStreamActivityStreamService {
    client: StreamClient;

    constructor(private options: {
        apiKey: string,
        apiSecret: string
        storage: {
            contentSharing: ContentSharingStorage,
            contentConversations: ContentConversationStorage,
        }
        getCurrentUserId(): Promise<number | string | null | undefined>
    }) {
        this.client = new StreamClient(options.apiKey, options.apiSecret)
    }


    followEntity: ActivityStreamsService['followEntity'] = async <EntityType extends keyof ActivityStream>(params: {
        entityType: EntityType
        entity: ActivityStream[EntityType]['entity']
        feeds: { user: boolean, notification: boolean }
    }): Promise<void> => {
        const userIdString = coerceToString(await this._getCurrentUserId())
        const follow = async (feedType: 'user' | 'notification') => {
            const feed = this.client.feed(feedType, userIdString);
            await feed.follow(params.entityType, coerceToString(params.entity.id))
        }
        if (params.feeds.user) {
            await follow('user')
        }
        if (params.feeds.notification) {
            await follow('notification')
        }
    }

    addActivity: ActivityStreamsService['addActivity'] = async <EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>>(params: {
        entityType: EntityType
        entity: ActivityStream[EntityType]['entity'],
    } & ActivityRequest<EntityType, ActivityType>): Promise<void> => {
        // const userIdString = coerceToString(await this._getCurrentUserId())
        // if (params.entityType === 'annotation' && params.activityType === 'reply') {
        //     const annotationFeed = this.client.feed(params.entityType, coerceToString(params.entity.id));
        //     const activity = params.activity as AnnotationReplyActivity['request']

        //     // Add an Activity; message is a custom field - tip: you can add unlimited custom fields!
        //     await annotationFeed.addActivity({
        //         actor: `user:${userIdString}`,
        //         verb: params.activityType as string,
        //         object: `${params.entityType}:${params.entity.id}`,
        //         foreign_id: `contentReply:${activity.replyReference.id}`,
        //         message: 'Beautiful bird!'
        //     });
        // }
    }

    async getNotifications(): Promise<Array<NotificationStreamResult<keyof ActivityStream>>> {
        return []
        // const userIdString = coerceToString(await this._getCurrentUserId())
        // const notifcations = this.client.feed('notification', userIdString)
        // const activities = await notifcations.get()
        // return (activities.results as any[]).map((activity): NotificationStreamResult => {
        //     const result: NotificationStreamResult<'annotation', 'reply'> = {
        //         entityType: 'annotation',
        //         entity: { type: 'shared-annotation-reference', id: 5 },
        //         activityType: 'reply',
        //         activity: { replyReference: { type: 'conversation-reply-reference', id: 7 } },
        //         seen: false,
        //         read: false,
        //     }
        //     return result as NotificationStreamResult
        // })
    }

    async _getCurrentUserId() {
        const userId = await this.options.getCurrentUserId()
        if (!userId) {
            throw new Error(`Cannot interact with activity streams unless authenticated`)
        }
        return userId
    }
}

function coerceToString(stringOrNumber: string | number): string {
    return typeof stringOrNumber !== 'string' ? stringOrNumber.toString() : stringOrNumber
}