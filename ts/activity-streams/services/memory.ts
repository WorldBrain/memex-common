import ContentConversationStorage from "../../content-conversations/storage";
import ContentSharingStorage from "../../content-sharing/storage";
import UserStorage from "../../user-management/storage";
import { ActivityStreamsService, ActivityStream, EntitityActivities, AddActivityParams, FollowEntityParams, FeedType, GetHomeActivitiesResult, GetActivitiesParams, GetHomeFeedInfoResult } from "./../types";
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
        this.follows.push({
            createdWhen: Date.now(),
            sourceEntity: { type: 'user', id: await this.options.getCurrentUserId()! },
            targetEntitity: { type: params.entityType, id: params.entity.id },
            feeds: params.feeds
        })
    }

    addActivity: ActivityStreamsService['addActivity'] = async <EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>>(
        params: AddActivityParams<EntityType, ActivityType>
    ): Promise<void> => {
        const userId = await this.options.getCurrentUserId()
        if (!userId) {
            throw new Error(`Tried to add new activity wtihout being authenticated: ${params.entityType}, ${params.activityType}`)
        }

        const { activity } = await concretizeActivity({
            storage: this.options.storage,
            ...params
        })

        this.activities.push({
            id: `act-${++this.activityCounter}`,
            createdWhen: Date.now(),
            entity: { type: params.entityType, id: params.entity.id },
            userId,
            type: params.activityType as string,
            data: activity,
        })

        if (params.follow) {
            await this.followEntity({
                entityType: params.entityType,
                entity: params.entity,
                feeds: params.follow,
            })
        }
    }

    _getFollow(userId: number | string, entity: { type: string, id: string | number }) {
        return this.follows.find(follow =>
            follow.sourceEntity.type === 'user' &&
            follow.sourceEntity.id == userId &&
            follow.targetEntitity.type === entity.type &&
            follow.targetEntitity.id === entity.id
        )
    }

    _followedActivities(userId: number | string) {
        return this.activities.filter(activity => {
            const follow = this._getFollow(userId, activity.entity)
            return follow && follow.createdWhen <= activity.createdWhen
        })
    }

    async getHomeFeedActivities(params: GetActivitiesParams): Promise<GetHomeActivitiesResult> {
        const userId = await this.options.getCurrentUserId()
        if (!userId) {
            throw new Error(`Tried to get notifications wtihout being authenticated`)
        }
        const userNotficationState = this.notificationStates[userId] ?? { seen: new Set(), read: new Set() }
        this.notificationStates[userId] = userNotficationState

        const aggregatedActivities = aggregate(this._followedActivities(userId).map(activity => {
            // TODO: TypeScript doesn't want to strongly type this
            return {
                id: activity.id,
                entityType: activity.entity.type,
                entity: activity.entity,
                activityType: activity.type,
                activity: activity.data,
            };
        }), value => `${value.entity.type}${value.entity.id}${value.activityType}`);

        const activityGroups = aggregatedActivities
            .reverse() // mutates the array, but that's OK in this case
            .slice(params.offset, params.offset + params.limit)
            .map(group => ({
                id: group.map(activity => activity.id).join(':'),
                entityType: group[0].entityType,
                entity: group[0].entity,
                activityType: group[0].activityType, activities: group
            }));
        return {
            hasMore: false,
            activityGroups: activityGroups as any[],
        }
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

function aggregate<T>(array: Array<T>, key: (value: T) => string) {
    let lastKey: string | null = null
    const aggregated: Array<T[]> = []
    for (const value of array) {
        const currentKey = key(value);
        if (currentKey !== lastKey) {
            aggregated.push([])
            lastKey = currentKey
        }
        const last = aggregated[aggregated.length - 1]
        last.push(value)
    }
    return aggregated
}
