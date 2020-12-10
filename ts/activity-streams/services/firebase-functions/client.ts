import { ActivityStreamsService, ActivityStream, EntitityActivities, ActivityRequest, FollowEntityParams, GetHomeActivitiesResult, GetActivitiesParams } from "../../types";

export default class FirebaseFunctionsActivityStreamsService implements ActivityStreamsService {
    constructor(private options: {
        executeCall(name: string, params: any): Promise<any>
    }) {
    }

    followEntity: ActivityStreamsService['followEntity'] = <EntityType extends keyof ActivityStream>(
        params: FollowEntityParams<EntityType>
    ): Promise<void> => {
        return this.options.executeCall('activityStreams-followEntity', params)
    }

    addActivity: ActivityStreamsService['addActivity'] = async <EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>>(params: {
        entityType: EntityType
        entity: ActivityStream[EntityType]['entity'],
    } & ActivityRequest<EntityType, ActivityType>): Promise<void> => {
        return this.options.executeCall('activityStreams-addActivity', params)
    }

    async getHomeActivities(params: GetActivitiesParams): Promise<GetHomeActivitiesResult> {
        return this.options.executeCall('activityStreams-getHomeActivities', {})
    }
}