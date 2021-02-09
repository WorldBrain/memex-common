import omit from 'lodash/omit';
import isPlainObject from 'lodash/isPlainObject'
import { StreamClient } from 'getstream'
import ContentSharingStorage from '../../content-sharing/storage';
import ContentConversationStorage from '../../content-conversations/storage';
import { AutoPkStorageReference, makeStorageReference, getStorageReferenceCollection } from '../../storage/references';
import UserStorage from '../../user-management/storage';
import { concretizeActivity } from '../utils';
import {
    ActivityStream, ActivityStreamsService, EntitityActivities,
    ConversationReplyActivity,
    AddActivityParams,
    GetHomeActivitiesResult,
    GetActivitiesParams,
    FollowEntityParams,
    FeedType,
    GetHomeFeedInfoResult,
    UnfollowEntityParams,
} from "../types";

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


    followEntity: ActivityStreamsService['followEntity'] = async <EntityType extends keyof ActivityStream>(
        params: FollowEntityParams<EntityType>
    ): Promise<void> => {
        const userIdString = coerceToString(await this._getCurrentUserId())
        const follow = async (feedType: FeedType) => {
            const feed = this.client.feed(feedType, userIdString);
            await feed.follow(params.entityType, coerceToString(params.entity.id))
        }
        if (params.feeds.home) {
            await follow('home')
        }
    }

    unfollowEntity: ActivityStreamsService['unfollowEntity'] = async <EntityType extends keyof ActivityStream>(
        params: UnfollowEntityParams<EntityType>
    ): Promise<void> => {
        const userIdString = coerceToString(await this._getCurrentUserId())
        const unfollow = async (feedType: FeedType) => {
            const feed = this.client.feed(feedType, userIdString);
            await feed.unfollow(params.entityType, coerceToString(params.entity.id))
        }
        if (params.feeds.home) {
            await unfollow('home')
        }
    }

    addActivity: ActivityStreamsService['addActivity'] = async <EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>>(
        params: AddActivityParams<EntityType, ActivityType>
    ): Promise<void> => {
        const userIdString = coerceToString(await this._getCurrentUserId())
        if (params.entityType === 'conversationThread' && params.activityType === 'conversationReply') {
            const annotationFeed = this.client.feed(params.entityType, coerceToString(params.entity.id));
            const activity = params.activity as ConversationReplyActivity['request']
            const data = await concretizeActivity({
                storage: this.options.storage,
                ...params,
            })
            const activityResult = data.activity as ConversationReplyActivity['result']
            const prepared = prepareActivityForStreamIO(data, {
                makeReference: (collection, id) => this.client.collections.entry(collection, coerceToString(id), null)
            })

            await Promise.all(Object.entries(prepared.objects).map(([collectionName, objects]) => {
                return this.client.collections.upsert(collectionName, objects.map((object) => {
                    return { id: coerceToString(object.id), ...object.data } as any
                }))
            }))

            await annotationFeed.addActivity({
                to: [`sharedPageInfo:${activityResult.pageInfo.reference.id}`],
                actor: `user:${userIdString}`,
                verb: params.activityType as string,
                object: `${params.entityType}:${params.entity.id}`,
                foreign_id: `contentReply:${activity.replyReference.id}`,
                ...prepared.activity,
            })
        }

        if (params.follow) {
            await this.followEntity({
                entityType: params.entityType,
                entity: params.entity,
                feeds: params.follow,
            })
        }
    }

    async getHomeFeedActivities(params: GetActivitiesParams): Promise<GetHomeActivitiesResult> {
        const userIdString = coerceToString(await this._getCurrentUserId())
        const homeFeed = this.client.feed('home', userIdString)
        const activities = await homeFeed.get({ enrich: true, offset: params.offset, limit: params.limit })
        const activityGroups = prepareActivitiesFromStreamIO(activities.results, {
            userIdString
        }).filter(({ activities }) => !!activities.length)
        return {
            hasMore: !!activities.next,
            activityGroups: activityGroups as any
        }
    }

    async getHomeFeedInfo(): Promise<GetHomeFeedInfoResult> {
        const userIdString = coerceToString(await this._getCurrentUserId())
        const homeFeed = this.client.feed('home', userIdString)
        const activities = await homeFeed.get({ offset: 0, limit: 1 })
        const firstActivity = activities.results[0]
        if (!firstActivity) {
            return { latestActivityTimestamp: null }
        }
        return { latestActivityTimestamp: new Date((firstActivity as any).updated_at).getTime() }
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
    const seen: { [collectionName: string]: Set<string | number> } = {}

    for (const [topKey, topValue] of Object.entries(concretized.activity)) {
        const reference = isPlainObject(topValue) && topValue['reference'] as AutoPkStorageReference<string>
        if (reference) {
            const type = getStorageReferenceCollection(reference)
            seen[type] = seen[type] ?? new Set()
            if (!seen[type].has(reference.id)) {
                objects[type] = objects[type] ?? []
                objects[type].push({
                    id: reference.id,
                    reference: options.makeReference(type, reference.id),
                    data: omit(topValue as any, 'reference')
                })
                seen[type].add(reference.id)
            }

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
        entity: makeStorageReference(entityType, entityId),
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
            activity['reference'] = makeStorageReference(value['collection'], value['id'])
            preparedActivity.activity[cleanKey] = value['data']
        } else {
            preparedActivity.activity[cleanKey] = value
        }
    }

    return preparedActivity
}

export function prepareActivitiesFromStreamIO(results: Array<{ [key: string]: any }>, options: {
    userIdString: string
}) {
    return results.map(result => {
        const activities = result.activities.filter(activity => {
            const [_, userIdString] = activity.actor.split(':')
            return userIdString !== options.userIdString
        }).map(prepareActivityFromStreamIO)
        if (!activities.length) {
            return null
        }
        return {
            id: result.group,
            entityType: activities[0].entityType,
            entity: activities[0].entity,
            activityType: activities[0].activityType,
            activities: activities.map(activity => omit(activity, 'entityType', 'entity', 'activityType')),
        }
    }).filter(group => !!group)
}

