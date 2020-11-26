import ContentConversationStorage from "../content-conversations/storage";
import ContentSharingStorage from "../content-sharing/storage";
import UserStorage from "../user-management/storage";
import { ActivityStreamsService, ActivityStream, NotificationStreamResult, ActivityRequest, EntitityActivities } from "./types";
import { concretizeActivity } from "./utils";

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

    async getNotifications(params?: { markAsSeen?: boolean }): Promise<Array<NotificationStreamResult<keyof ActivityStream>>> {
        const userId = await this.options.getCurrentUserId()
        if (!userId) {
            throw new Error(`Tried to get notifications wtihout being authenticated`)
        }
        const userNotficationState = this.notificationStates[userId] ?? { seen: new Set(), read: new Set() }
        this.notificationStates[userId] = userNotficationState

        return this._followedActivities(userId).map(activity => {
            const seen = userNotficationState.seen.has(activity.id)
            const read = userNotficationState.read.has(activity.id)

            if (params?.markAsSeen) {
                userNotficationState.seen.add(activity.id)
            }

            // TODO: TypeScript doesn't want to strongly type this
            return {
                id: activity.id,
                entityType: activity.entity.type,
                entity: activity.entity,
                activityType: activity.type,
                activity: activity.data,
                seen,
                read,
            } as any
        })
    }

    async getNotifcationInfo(): Promise<{ unseenCount: number, unreadCount: number }> {
        const userId = await this.options.getCurrentUserId()
        if (!userId) {
            throw new Error(`Tried to get notification info wtihout being authenticated`)
        }

        const userNotficationState = this.notificationStates[userId] ?? { seen: new Set(), read: new Set() }
        return {
            unseenCount: this._followedActivities(userId).filter(activity => !userNotficationState.seen.has(activity.id)).length,
            unreadCount: this._followedActivities(userId).filter(activity => !userNotficationState.read.has(activity.id)).length,
        }
    }

    async markNotifications(params: { ids: Array<number | string>, seen?: boolean, read?: boolean }): Promise<void> {
        const userId = await this.options.getCurrentUserId()
        if (!userId) {
            throw new Error(`Tried to mark notification(s) as read wtihout being authenticated: ${params.ids.join(', ')}`)
        }

        const ids = params.ids as number[]
        const addIds = (set: Set<number>) => {
            for (const id of ids) {
                set.add(id)
            }
        }
        if (params.seen) {
            addIds(this.notificationStates[userId].seen)
        }
        if (params.read) {
            addIds(this.notificationStates[userId].read)
        }
    }
}
