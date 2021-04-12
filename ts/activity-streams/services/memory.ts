import ContentConversationStorage from "../../content-conversations/storage";
import ContentSharingStorage from "../../content-sharing/storage";
import UserStorage from "../../user-management/storage";
import { ActivityStreamsService, ActivityStream, EntitityActivities, AddActivityParams, FollowEntityParams, FeedType, GetHomeActivitiesResult, GetActivitiesParams, GetHomeFeedInfoResult, UnfollowEntityParams, ConversationReplyActivity } from "./../types";
import { concretizeActivity } from "../utils";

export interface MemoryFollow {
    createdWhen: number
    sourceEntity: { type: string, id: string | number }
    targetEntitity: { type: string, id: string | number }
    feeds: { [K in FeedType]: boolean }
}
export interface MemoryActivity {
    id: string
    createdWhen: number
    userId: string | number
    entity: { type: string, id: string | number }
    type: string
    data: any
}

export default class MemoryStreamsService implements ActivityStreamsService {
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
            users: UserStorage
        }
        getCurrentUserId(): Promise<number | string | null | undefined>
    }) { }

    followEntity: ActivityStreamsService['followEntity'] = async <EntityType extends keyof ActivityStream>(
        params: FollowEntityParams<EntityType>
    ): Promise<void> => {
        const userId = await this._ensureUserId(`Tried to follow entity wtihout being authenticated: ${params.entityType}, ${params.entity.id}`)

        if (!this._getFollow(userId, { type: params.entityType, id: params.entity.id })) {
            this.follows.push({
                createdWhen: Date.now(),
                sourceEntity: { type: 'user', id: await this.options.getCurrentUserId()! },
                targetEntitity: { type: params.entityType, id: params.entity.id },
                feeds: params.feeds
            })
        }
    }

    unfollowEntity: ActivityStreamsService['unfollowEntity'] = async <EntityType extends keyof ActivityStream>(
        params: UnfollowEntityParams<EntityType>
    ): Promise<void> => {
        const userId = await this._ensureUserId(`Tried to unfollow entity wtihout being authenticated: ${params.entityType}, ${params.entity.id}`)
        const followIndex = this._getFollowIndex(userId, { type: params.entityType, id: params.entity.id })
        if (followIndex >= 0) {
            this.follows.splice(followIndex, 1)
        }
    }

    addActivity: ActivityStreamsService['addActivity'] = async <EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>>(
        params: AddActivityParams<EntityType, ActivityType>
    ): Promise<void> => {
        const userId = await this._ensureUserId(`Tried to add new activity wtihout being authenticated: ${params.entityType}, ${params.activityType}`)

        const { activity } = await concretizeActivity({
            storage: this.options.storage,
            ...params
        })

        const storedActivity = {
            id: `act-${++this.activityCounter}`,
            createdWhen: Date.now(),
            entity: { type: params.entityType, id: params.entity.id },
            userId,
            type: params.activityType as string,
            data: activity,
        };
        this.activities.push(storedActivity)
        if (params.entityType === 'conversationThread' && params.activityType === 'conversationReply') {
            const replyActivity = activity as ConversationReplyActivity['result']
            this.activities.push({ ...storedActivity, entity: { type: 'sharedPageInfo', id: replyActivity.pageInfo.reference.id } })
        }

        if (params.follow) {
            await this.followEntity({
                entityType: params.entityType,
                entity: params.entity,
                feeds: params.follow,
            })
        }
    }

    _getFollow(userId: number | string, entity: { type: string, id: string | number }) {
        const followIndex = this._getFollowIndex(userId, entity)
        return followIndex >= 0 ? this.follows[followIndex] : null
    }

    _getFollowIndex(userId: number | string, entity: { type: string, id: string | number }) {
        return this.follows.findIndex(follow =>
            follow.sourceEntity.type === 'user' &&
            follow.sourceEntity.id == userId &&
            follow.targetEntitity.type === entity.type &&
            follow.targetEntitity.id === entity.id
        )
    }

    _followedActivities(userId: number | string) {
        return this.activities.filter(activity => {
            if (activity.userId === userId) {
                return false
            }
            const follow = this._getFollow(userId, activity.entity)
            return follow && follow.createdWhen <= activity.createdWhen
        })
    }

    async _ensureUserId(unauthenticatedMessage: string) {
        const userId = await this.options.getCurrentUserId()
        if (!userId) {
            throw new Error(unauthenticatedMessage)
        }
        return userId
    }

    async _getRawHomeFeedActivities(params: GetActivitiesParams) {
        const userId = await this._ensureUserId(`Tried to get notifications wtihout being authenticated`)
        const userNotficationState = this.notificationStates[userId] ?? { seen: new Set(), read: new Set() }
        this.notificationStates[userId] = userNotficationState

        const aggregatedActivities = aggregate(this._followedActivities(userId), activity => ({
            id: activity.id,
            entityType: activity.entity.type,
            entity: activity.entity,
            activityType: activity.type,
            activity: activity.data
        }), value => `${value.entity.type}${value.entity.id}${value.activityType}`);

        const activityGroups = aggregatedActivities
            .reverse() // mutates the array, but that's OK in this case
            .slice(params.offset, params.offset + params.limit)
        return activityGroups
    }

    async getHomeFeedActivities(params: GetActivitiesParams): Promise<GetHomeActivitiesResult> {
        const activityGroups = (await this._getRawHomeFeedActivities(params)).map(group => ({
            id: group.items.map(activity => activity.id).join(':'),
            entityType: group.key.entityType,
            entity: group.key.entity,
            activityType: group.key.activityType,
            activities: group.items.map(activity => ({
                id: activity.id,
                entityType: activity.entity.type,
                entity: activity.entity,
                activityType: activity.type,
                activity: activity.data
            })),
        }));
        return {
            hasMore: false,
            activityGroups: activityGroups as any[],
        }
    }

    async getRawFeedActivitiesForDebug(params: GetActivitiesParams) {
        return this._getRawHomeFeedActivities(params)
    }

    async getHomeFeedInfo(): Promise<GetHomeFeedInfoResult> {
        const activities = await this.getHomeFeedActivities({
            offset: 0,
            limit: 1
        });
        return {
            latestActivityTimestamp: activities.activityGroups.length
                ? (activities.activityGroups[0].activities[0].activity as any).reply.createdWhen
                : null
        }
    }
}

export function aggregate<T, Key>(array: Array<T>, key: (value: T) => Key, hash: (key: Key) => string) {
    let lastKey: string | null = null
    const aggregated: Array<{ hash: string, key: Key, items: T[] }> = []
    const groupIndices = new Map<string, number>()
    for (const value of array) {
        const currentKey = key(value);
        const currentHash = hash(currentKey);
        if (currentHash !== lastKey) {
            if (!groupIndices.has(currentHash)) {
                groupIndices.set(currentHash, aggregated.length)
                aggregated.push({ hash: currentHash, key: currentKey, items: [] })
            } else {
                // bump old group to top by swapping the old one with the newest one
                const oldGroupIndex = groupIndices.get(currentHash)
                const newestGroupIndex = aggregated.length - 1

                const oldGroup = aggregated[oldGroupIndex]
                const newestGroup = aggregated[newestGroupIndex]

                groupIndices.set(oldGroup.hash, newestGroupIndex)
                groupIndices.set(newestGroup.hash, oldGroupIndex)

                aggregated[oldGroupIndex] = newestGroup
                aggregated[newestGroupIndex] = oldGroup
            }

            lastKey = currentHash
        }

        const last = aggregated[aggregated.length - 1]
        last.items.push(value)
    }
    return aggregated
}
