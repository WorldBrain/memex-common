import { ActivityStreamsService, ActivityStream, NotificationStreamResult, ActivityRequest, EntitityActivities } from "./types";

export interface MemoryFollow {
    source: { type: string, id: string | number }
    target: { type: string, id: string | number }
    feeds: { user: boolean, notification: boolean }
}
export interface MemoryActivity {
    source: { type: string, id: string | number }
    type: string
    data: any
}

export default class MemoryStreamsService {
    follows: MemoryFollow[] = []
    activities: MemoryActivity[] = []

    constructor(private options: {
        getCurrentUserId(): Promise<number | string | null | undefined>
    }) { }

    followEntity: ActivityStreamsService['followEntity'] = async <EntityType extends keyof ActivityStream>(params: {
        entityType: EntityType
        entity: ActivityStream[EntityType]['entity']
        feeds: { user: boolean, notification: boolean }
    }): Promise<void> => {
        this.follows.push({
            source: { type: 'user', id: await this.options.getCurrentUserId()! },
            target: { type: params.entityType, id: params.entity.id },
            feeds: params.feeds
        })
    }

    addActivity: ActivityStreamsService['addActivity'] = async <EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>>(params: {
        entityType: EntityType
        entity: ActivityStream[EntityType]['entity'],
    } & ActivityRequest<EntityType, ActivityType>): Promise<void> => {
    }

    async getNotifications(): Promise<Array<NotificationStreamResult<keyof ActivityStream>>> {
        return []
    }
}