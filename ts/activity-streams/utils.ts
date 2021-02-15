import { ActivityStream, ActivityRequest, EntitityActivities, ActivityResult, ConversationReplyActivity, ListEntryActivity } from "./types";
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
        contentSharing: Pick<ContentSharingStorage, 'getAnnotation' | 'getPageInfoByCreatorAndUrl' | 'getListEntryByReference' | 'getListByReference'>,
        contentConversations: Pick<ContentConversationStorage, 'getReply'>,
        users: Pick<UserStorage, 'getUser'>
    }
    entityType: EntityType
    entity: ActivityStream[EntityType]['entity'],
} & ActivityRequest<EntityType, ActivityType>): Promise<ActivityResult<EntityType, ActivityType>> {
    const { contentSharing } = params.storage

    if (params.entityType === 'conversationThread' && params.activityType === 'conversationReply') {
        const activityRequest = params.activity as ConversationReplyActivity['request']
        const replyData = await params.storage.contentConversations.getReply({
            annotationReference: activityRequest.annotationReference,
            replyReference: activityRequest.replyReference,
        })
        if (!replyData) {
            throw new Error(`Could not concrectize annotation reply activity: reply not found`)
        }
        const annotation = await contentSharing.getAnnotation({
            reference: replyData.sharedAnnotation,
        })
        if (!annotation) {
            throw new Error(`Could not concrectize annotation reply activity: annotation not found`)
        }
        const { pageInfo, reference: pageInfoReference } = await contentSharing.getPageInfoByCreatorAndUrl({
            normalizedUrl: replyData.reply.normalizedPageUrl,
            creatorReference: annotation.creatorReference,
        })
        if (!pageInfo) {
            throw new Error(`Could not concrectize annotation reply activity: page info not found`)
        }
        const [annotationCreator, replyCreator] = await Promise.all([
            params.storage.users.getUser(annotation.creatorReference),
            params.storage.users.getUser(replyData.userReference)
        ])

        const activity: ConversationReplyActivity['result'] = {
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
                previousReplyReference: replyData.previousReply,
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
        return {
            activity,
        }
    } else if (params.entityType === 'sharedList' && params.activityType === 'sharedListEntry') {
        const activityRequest = params.activity as ListEntryActivity['request']
        const listEntry = await contentSharing.getListEntryByReference(activityRequest.entryReference)
        if (!listEntry) {
            throw new Error(`Could not concretize list entry activity: list entry not found`)
        }
        const list = await contentSharing.getListByReference(listEntry.sharedList)
        if (!list) {
            throw new Error(`Could not concretize list entry activity: list not found`)
        }
        const entryCreatorReference = listEntry.creator
        const listCreatorReference = list.creator

        const [entryCreator, listCreator] = await Promise.all([
            params.storage.users.getUser(entryCreatorReference),
            params.storage.users.getUser(listCreatorReference)
        ])
        if (!entryCreator) {
            throw new Error(`Could not concretize list entry activity: list entry creator not found`)
        }
        if (!listCreator) {
            throw new Error(`Could not concretize list entry activity: list creator not found`)
        }

        delete listEntry.creator
        delete listEntry.sharedList
        delete list.creator

        const activity: ListEntryActivity['result'] = {
            entry: listEntry,
            entryCreator: {
                reference: entryCreatorReference,
                ...entryCreator,
            },
            list,
            listCreator: {
                reference: listCreatorReference,
                ...listCreator,
            },
        }
        return { activity }
    }

    throw new Error(`Tried to concretize unknown activity: ${params.entityType}, ${params.activityType}`)
}
