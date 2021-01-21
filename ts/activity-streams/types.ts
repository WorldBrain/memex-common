import { SharedAnnotationReference, SharedListReference, SharedAnnotation, SharedPageInfo, SharedPageInfoReference, SharedListEntryReference, SharedList, SharedListEntry } from "../content-sharing/types";
import { ConversationReplyReference, ConversationReply } from "../content-conversations/types";
import { UserReference, User } from "../web-interface/types/users";

export interface ActivityStreamsService {
    followEntity<EntityType extends keyof ActivityStream>(params: FollowEntityParams<EntityType>): Promise<void>
    addActivity<EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>>(
        params: AddActivityParams<EntityType, ActivityType>
    ): Promise<void>
    getHomeFeedActivities(params: GetActivitiesParams): Promise<GetHomeActivitiesResult>
    getHomeFeedInfo(): Promise<GetHomeFeedInfoResult>
}

export interface FollowEntityParams<EntityType extends keyof ActivityStream> {
    entityType: EntityType
    entity: ActivityStream[EntityType]['entity']
    feeds: { [K in FeedType]: boolean }
}

export type AddActivityParams<EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>> = {
    entityType: EntityType
    entity: ActivityStream[EntityType]['entity'],
    follow?: { [K in FeedType]: boolean }
} & ActivityRequest<EntityType, ActivityType>

export interface GetActivitiesParams {
    limit: number;
    offset: number;
}
export interface GetHomeActivitiesResult {
    activityGroups: Array<ActivityStreamResultGroup<keyof ActivityStream>>
    hasMore: boolean
}
export interface GetHomeFeedInfoResult {
    latestActivityTimestamp: number | null
}

export type FeedType = 'home'

export type ActivityStream = AnnotationActivityStream & PageActivityStream & ListActivityStream

export interface ActivityStreamResultGroup<
    EntityType extends keyof ActivityStream = keyof ActivityStream,
    ActivityType extends keyof EntitityActivities<EntityType> = keyof EntitityActivities<EntityType>
    > {
    id: string
    entityType: EntityType
    entity: ActivityStream[EntityType]['entity'],
    activityType: keyof ActivityStream[EntityType]['activities']
    activities: ActivitiyStreamResults<EntityType, ActivityType>
}
export type ActivitiyStreamResults<
    EntityType extends keyof ActivityStream = keyof ActivityStream,
    ActivityType extends keyof EntitityActivities<EntityType> = keyof EntitityActivities<EntityType>
    > = Array<ActivityStreamResult<EntityType, ActivityType>>;
export type ActivityStreamResult<EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType> = keyof EntitityActivities<EntityType>> = {
    id: number | string
    // entityType: EntityType,
    // entity: ActivityStream[EntityType]['entity'],
} & ActivityResult<EntityType, ActivityType>
export type ActivityRequest<EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>> = {
    activityType: ActivityType,
    activity: IndexType<IndexType<EntitityActivities<EntityType>, ActivityType>, 'request'>
}
export type ActivityResult<EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>> = {
    // activityType: ActivityType,
    activity: IndexType<IndexType<EntitityActivities<EntityType>, ActivityType>, 'result'>
}
export type EntitityActivities<EntityType extends keyof ActivityStream> = IndexType<IndexType<ActivityStream, EntityType>, 'activities'>
export type EntitityActivity<EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>> = IndexType<EntitityActivities<EntityType>, ActivityType>

export interface ActivityDefinitionBaseType {
    entity: any
    activities: {
        [activityName: string]: {
            request: {}
            result: {}
        }
    }
}

export type ActivityStreamDefinition<EntityName extends string, Definition extends ActivityDefinitionBaseType> = {
    [Key in EntityName]: {
        entity: Definition['entity']
        activities: Definition['activities']
    }
}

export type AnnotationActivityStream = ActivityStreamDefinition<'sharedAnnotation', {
    entity: SharedAnnotationReference
    activities: {
        conversationReply: AnnotationReplyActivity
    }
}>

export interface AnnotationReplyActivity {
    request: {
        replyReference: ConversationReplyReference;
        isFirstReply: boolean
    };
    result: {
        isFirstReply?: boolean // WARNING: This field is supplied by the user and not checked, so is only meant to be used where tampering has a low impact
        normalizedPageUrl: string;
        pageInfo: {
            reference: SharedPageInfoReference
        } & SharedPageInfo
        replyCreator: {
            reference: UserReference;
        } & User
        reply: {
            reference: ConversationReplyReference;
        } & ConversationReply
        annotationCreator: {
            reference: UserReference
        } & User
        annotation: {
            reference: SharedAnnotationReference;
        } & SharedAnnotation
    };
}

export type PageActivityStream = ActivityStreamDefinition<'sharedPageInfo', {
    entity: SharedPageInfoReference,
    activities: {
        conversationReply: AnnotationReplyActivity
    }
}>

export type ListActivityStream = ActivityStreamDefinition<'sharedList', {
    entity: SharedListReference
    activities: {
        sharedListEntry: ListEntryActivity
    }
}>

export interface ListEntryActivity {
    request: {
        entryReference: SharedListEntryReference
    },
    result: {
        entry: { reference: SharedListEntryReference } & SharedListEntry
        entryCreator: { reference: UserReference } & User
        list: { reference: SharedListReference } & SharedList
        listCreator: { reference: UserReference } & User
    }
}

// Workaround for:
// https://stackoverflow.com/questions/64699531/indexing-a-nested-object-with-two-dependent-type-parameters-fails-in-typescript/64700607
type IndexType<Type, Key extends string | number | symbol> = Extract<Type, { [K in Key]: unknown }>[Key]

