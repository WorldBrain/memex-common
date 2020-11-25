import camelCase from 'lodash/camelCase'
import kebabCase from 'lodash/kebabCase'
import isPlainObject from 'lodash/isPlainObject'
import { StreamClient } from 'getstream'
import ContentSharingStorage from '../content-sharing/storage';
import ContentConversationStorage from '../content-conversations/storage';
import { ActivityStream, NotificationStreamResult, ActivityStreamsService, ActivityRequest, EntitityActivities, AnnotationReplyActivity, ActivityResult } from "./types";
import { concretizeActivity } from './utils';
import UserStorage from '../user-management/storage';
import omit from 'lodash/omit';
import { AutoPkStorageReference } from 'src/storage/references';

export default class GetStreamActivityStreamService implements ActivityStreamsService {
    client: StreamClient;

    constructor(private options: {
        apiKey: string,
        apiSecret: string
        storage: {
            contentSharing: ContentSharingStorage,
            contentConversations: ContentConversationStorage,
            users: UserStorage,
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
            console.log('follow', feedType, params.entityType, params.entity)
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
        const userIdString = coerceToString(await this._getCurrentUserId())
        if (params.entityType === 'sharedAnnotation' && params.activityType === 'conversationReply') {
            const annotationFeed = this.client.feed(params.entityType, coerceToString(params.entity.id));
            const activity = params.activity as AnnotationReplyActivity['request']
            const data = await concretizeActivity({
                storage: this.options.storage,
                ...params,
            })
            const prepared = prepareActivityForStreamIO(data, {
                makeReference: (collection, id) => this.client.collections.entry(collection, coerceToString(id), null)
            })

            await Promise.all(Object.entries(prepared.objects).map(([collectionName, objects]) => {
                return this.client.collections.upsert(collectionName, objects.map((object) => {
                    return { id: coerceToString(object.id), ...object.data } as any
                }))
            }))

            // Add an Activity; message is a custom field - tip: you can add unlimited custom fields!
            await annotationFeed.addActivity({
                actor: `user:${userIdString}`,
                verb: params.activityType as string,
                object: `${params.entityType}:${params.entity.id}`,
                foreign_id: `contentReply:${activity.replyReference.id}`,
                ...prepared.activity,
            })
        }
    }

    async getNotifications(): Promise<Array<NotificationStreamResult<keyof ActivityStream>>> {
        const userIdString = coerceToString(await this._getCurrentUserId())
        const notifcations = this.client.feed('notification', userIdString)
        const activities = await notifcations.get({ enrich: true })
        return prepareActivitiesFromStreamIO(activities.results) as any
    }

    async markNotifications(params: { ids: Array<number | string>, seen: boolean, read: boolean }): Promise<void> {
        const ids = params.ids as string[]
        const userIdString = coerceToString(await this._getCurrentUserId())
        const feed = this.client.feed('notification', userIdString)
        await feed.get({
            mark_read: params.read ? ids : undefined,
            mark_seen: params.seen ? ids : undefined,
        })
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

export function prepareActivityForStreamIO(concretized: { activity: any }, options: {
    makeReference(collection: string, id: string | number): any
}): {
    activity: { [key: string]: any },
    objects: { [collectionName: string]: Array<{ id: string | number, reference: any, data: { [key: string]: any } }> },
} {
    const activity: { [key: string]: any } = {}
    const objects: { [collectionName: string]: Array<{ id: string | number, reference: any, data: { [key: string]: any } }> } = {}

    for (const [topKey, topValue] of Object.entries(concretized.activity)) {
        const reference = isPlainObject(topValue) && topValue['reference'] as AutoPkStorageReference<string>
        if (reference) {
            const type = referenceCollectionType(reference)
            objects[type] = objects[type] ?? []
            objects[type].push({
                id: reference.id,
                reference: options.makeReference(type, reference.id),
                data: omit(topValue as any, 'reference')
            })
            activity['data_' + topKey] = options.makeReference(type, reference.id)
        } else {
            activity['data_' + topKey] = topValue
        }
    }

    return {
        activity,
        objects,
    }
}

export function prepareActivityFromStreamIO(activity: { [key: string]: any }) {
    const [entityType, entityId] = activity.object.split(':')
    const preparedActivity: {
        entityType: string,
        entity: AutoPkStorageReference<string>,
        activityType: string,
        activity: { [key: string]: any }
    } = {
        entityType: entityType,
        entity: referenceFromCollectionId(entityType, entityId),
        activityType: activity.verb,
        activity: {}
    }
    for (const [key, value] of Object.entries(activity)) {
        if (!key.startsWith('data_')) {
            continue
        }
        const cleanKey = key.slice('data_'.length)

        if (isPlainObject(value) && value['collection'] && value['id'] && value['data']) {
            const activity = value['data']
            activity['reference'] = referenceFromCollectionId(value['collection'], value['id'])
            preparedActivity.activity[cleanKey] = value['data']
        } else {
            preparedActivity.activity[cleanKey] = value
        }
    }

    return preparedActivity
}

export function prepareActivitiesFromStreamIO(results: Array<{ [key: string]: any }>) {
    return results.map(result => ({
        id: result.id,
        seen: result.is_seen,
        read: result.is_read,
        ...prepareActivityFromStreamIO(result.activities[0])
    }))
}

export function referenceCollectionType(reference: AutoPkStorageReference<string>) {
    return camelCase(reference.type.replace(/-reference$/, ''))
}

export function referenceFromCollectionId(collection: string, id: string) {
    return { type: kebabCase(collection) + '-reference', id }
}
