import { ActivityStream, ActivityRequest, EntitityActivities, ActivityResult, AnnotationReplyActivity } from "./types";
import ContentConversationStorage from "../content-conversations/storage";
import ContentSharingStorage from "../content-sharing/storage";
import { SharedAnnotationReference } from '../content-sharing/types';
import UserStorage from '../user-management/storage';
import { UserReference } from "../web-interface/types/users";
import omit from "lodash/omit";

export class UnseenActivityTracker {
    _user: UserReference | null = null

    constructor(private options: {
        getLatestActivityTimestamp(): Promise<number | null>
        getHomeFeedTimestamp(user: UserReference): Promise<number | null>
    }) {

    }

    needsUpdate(newUser: UserReference | null) {
        return !(this._user?.id === newUser?.id)
    }

    async update(newUser: UserReference | null): Promise<{ hasUnseen: boolean }> {
        if (!newUser) {
            delete this._user
            return { hasUnseen: false }
        }
        this._user = newUser

        const [latestActivityTimestamp, homeFeedTimestamp] = await Promise.all([
            this.options.getLatestActivityTimestamp(),
            this.options.getHomeFeedTimestamp(newUser)
        ])

        return { hasUnseen: hasUnseenActivities({ latestActivityTimestamp, homeFeedTimestamp }) }
    }
}

export function hasUnseenActivities(params: {
    latestActivityTimestamp: number | null,
    homeFeedTimestamp: number | null,
}) {
    if (!params.latestActivityTimestamp) {
        return false
    }
    if (!params.homeFeedTimestamp) {
        return true
    }
    return params.latestActivityTimestamp > params.homeFeedTimestamp
}

export async function concretizeActivity<EntityType extends keyof ActivityStream, ActivityType extends keyof EntitityActivities<EntityType>>(params: {
    storage: {
        contentSharing: Pick<ContentSharingStorage, 'getAnnotation' | 'getPageInfoByCreatorAndUrl'>,
        contentConversations: Pick<ContentConversationStorage, 'getReply'>,
        users: Pick<UserStorage, 'getUser'>
    }
    entityType: EntityType
    entity: ActivityStream[EntityType]['entity'],
} & ActivityRequest<EntityType, ActivityType>): Promise<ActivityResult<EntityType, ActivityType>> {
    if (params.entityType === 'sharedAnnotation' && params.activityType === 'conversationReply') {
        const activityRequest = params.activity as AnnotationReplyActivity['request']
        const replyData = await params.storage.contentConversations.getReply({
            annotationReference: params.entity as SharedAnnotationReference,
            replyReference: activityRequest.replyReference,
        })
        if (!replyData) {
            throw new Error(`Could not concrectize annotation reply activity: reply not found`)
        }
        const annotation = await params.storage.contentSharing.getAnnotation({
            reference: replyData.sharedAnnotation,
        })
        if (!annotation) {
            throw new Error(`Could not concrectize annotation reply activity: annotation not found`)
        }
        const { pageInfo, reference: pageInfoReference } = await params.storage.contentSharing.getPageInfoByCreatorAndUrl({
            normalizedUrl: replyData.reply.normalizedPageUrl,
            creatorReference: annotation.creatorReference,
        })
        if (!pageInfo) {
            throw new Error(`Could not concrectize annotation reply activity: page info not found`)
        }
        const annotationCreator = await params.storage.users.getUser(annotation.creatorReference)
        const replyCreator = await params.storage.users.getUser(replyData.userReference)

        const activity: AnnotationReplyActivity['result'] = {
            normalizedPageUrl: replyData.reply.normalizedPageUrl,
            pageInfo: {
                reference: pageInfoReference,
                ...pageInfo,
            },
            replyCreator: {
                reference: replyData.userReference,
                ...replyCreator
            },
            reply: {
                reference: activityRequest.replyReference,
                ...replyData.reply
            },
            annotationCreator: {
                reference: annotation.creatorReference,
                ...annotationCreator,
            },
            annotation: {
                reference: replyData.sharedAnnotation,
                ...omit(annotation.annotation, 'selector'),
            },
        }
        if (activityRequest.isFirstReply) {
            activity.isFirstReply = true
        }
        return {
            activity,
        }
    }

    throw new Error(`Tried to concretize unknown activity: ${params.entityType}, ${params.activityType}`)
}
