import { ActivityStreamsService, ActivityStream, EntitityActivities, ActivityRequest, NotificationStreamResult } from "../types";

export default class FirebaseFunctionsActivityStreamsService implements ActivityStreamsService {
    constructor(private options: {
        executeCall(name: string, params: any): Promise<any>
    }) {
    }

    followEntity: ActivityStreamsService['followEntity'] = async <EntityType extends keyof ActivityStream>(params: {
        entityType: EntityType
        entity: ActivityStream[EntityType]['entity']
        feeds: { user: boolean, notification: boolean }
    }): Promise<void> => {
        return this.options.executeCall('activityStreams-followEntity', params)
    }

    addActivity: ActivityStreamsService['addActivity'] = async <EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>>(params: {
        entityType: EntityType
        entity: ActivityStream[EntityType]['entity'],
    } & ActivityRequest<EntityType, ActivityType>): Promise<void> => {
        return this.options.executeCall('activityStreams-addActivity', params)
    }

    async getNotifications(): Promise<Array<NotificationStreamResult<keyof ActivityStream>>> {
        return this.options.executeCall('activityStreams-getNotifications', {})
    }

    async markNotifications(params: { ids: Array<number | string>, seen: boolean, read: boolean }): Promise<void> {
        return this.options.executeCall('activityStreams-markNotifications', params)
    }
}