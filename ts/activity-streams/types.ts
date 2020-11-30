import { SharedAnnotationReference, SharedListReference, SharedAnnotation, SharedPageInfo, SharedPageInfoReference } from "../content-sharing/types";
import { ConversationReplyReference, ConversationReply } from "../content-conversations/types";
import { UserReference, User } from "../web-interface/types/users";

export interface ActivityStreamsService {
    followEntity<EntityType extends keyof ActivityStream>(params: {
        entityType: EntityType
        entity: ActivityStream[EntityType]['entity']
        feeds: { user: boolean, notification: boolean }
    }): Promise<void>
    addActivity<EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>>(
        params: AddActivityParams<EntityType, ActivityType>
    ): Promise<void>
    getNotifcationInfo(): Promise<{ unseenCount: number, unreadCount: number }>
    getNotifications(params: GetNotificationsParams): Promise<GetNotificationsResults>
    markNotifications(params: { ids: Array<number | string>, seen?: boolean, read?: boolean }): Promise<void>
}

export type AddActivityParams<EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>> = {
    entityType: EntityType
    entity: ActivityStream[EntityType]['entity'],
    follow?: { user: boolean, notification: boolean }
} & ActivityRequest<EntityType, ActivityType>

export interface GetNotificationsParams {
    markAsSeen?: boolean;
    limit: number;
    offset: number;
}
export interface GetNotificationsResults {
    activities: NotificationStream
    hasMore: boolean
}

export type ActivityStream = AnnotationActivityStream & ListActivityStream

export type NotificationStream = Array<NotificationStreamResult<keyof ActivityStream>>;
export type NotificationStreamResult<
    EntityType extends keyof ActivityStream = keyof ActivityStream,
    ActivityType extends keyof EntitityActivities<EntityType> = keyof EntitityActivities<EntityType>> =
    ActivityStreamResult<EntityType, ActivityType> &
    {
        seen: boolean
        read: boolean
    }
export type ActivityStreamResult<EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType> = keyof EntitityActivities<EntityType>> = {
    id: number | string
    entityType: EntityType,
    entity: ActivityStream[EntityType]['entity'],
} & ActivityResult<EntityType, ActivityType>
export type ActivityRequest<EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>> = {
    activityType: ActivityType,
    activity: IndexType<IndexType<EntitityActivities<EntityType>, ActivityType>, 'request'>
}
export type ActivityResult<EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>> = {
    activityType: ActivityType,
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
    };
    result: {
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

export type ListActivityStream = ActivityStreamDefinition<'list', {
    entity: SharedListReference
    activities: {
        newEntry: {
            request: {
                normalizedPageUrl: string
            },
            result: {}
        }
    }
}>

// Workaround for:
// https://stackoverflow.com/questions/64699531/indexing-a-nested-object-with-two-dependent-type-parameters-fails-in-typescript/64700607
type IndexType<Type, Key extends string | number | symbol> = Extract<Type, { [K in Key]: unknown }>[Key]

