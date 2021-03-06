import fromPairs from 'lodash/fromPairs'

import {
    getInitialNewReplyState,
    getInitialAnnotationConversationState,
} from './utils'
import { executeUITask } from '../../main-ui/classes/logic'
import ContentConversationStorage from '../storage'
import ContentSharingStorage from '../../content-sharing/storage'
import type {
    AnnotationConversationsState,
    AnnotationConversationEvent,
    AnnotationConversationsHandlers,
    AnnotationConversationSignal,
    AnnotationConversationState,
} from './types'
import type { UILogic } from '../../main-ui/classes/logic'
import type { UserReference, User } from '../../web-interface/types/users'
import type {
    SharedAnnotationReference,
    SharedAnnotation,
    SharedListReference,
    SharedAnnotationListEntryReference,
    SharedAnnotationListEntry,
} from '../../content-sharing/types'
import type { ContentConversationsServiceInterface } from '../service/types'

export function annotationConversationInitialState(): AnnotationConversationsState {
    return {
        newPageReplies: {},
        conversations: {},
    }
}

export function intializeNewPageReplies(
    logic: UILogic<AnnotationConversationsState, AnnotationConversationEvent>,
    dependencies: { normalizedPageUrls: string[] },
) {
    logic.emitMutation({
        newPageReplies: fromPairs(
            [...dependencies.normalizedPageUrls].map((normalizedPageUrl) => [
                normalizedPageUrl,
                { $set: getInitialNewReplyState() },
            ]),
        ),
    })
}

export async function detectAnnotationConversationThreads(
    logic: UILogic<AnnotationConversationsState, AnnotationConversationEvent>,
    dependencies: {
        getThreadsForAnnotations: ContentConversationStorage['getThreadsForAnnotations']
        annotationReferences: SharedAnnotationReference[]
    },
) {
    const threads = await dependencies.getThreadsForAnnotations({
        annotationReferences: dependencies.annotationReferences,
    })
    logic.emitMutation({
        conversations: fromPairs([
            ...dependencies.annotationReferences.map((ref) => [
                ref.id,
                {
                    $apply: (previousState: AnnotationConversationsState) =>
                        previousState ??
                        getInitialAnnotationConversationState(),
                },
            ]),
            ...threads.map((threadData) => [
                threadData.sharedAnnotation.id,
                {
                    $apply: (previousState: AnnotationConversationState) => ({
                        ...(previousState ??
                            getInitialAnnotationConversationState()),
                        thread: threadData.thread,
                    }),
                },
            ]),
        ]),
    })
}

export function annotationConversationEventHandlers<
    State extends AnnotationConversationsState
>(
    logic: UILogic<AnnotationConversationsState, AnnotationConversationEvent>,
    dependencies: {
        createAnnotations?: ContentSharingStorage['createAnnotations']
        submitNewReply: ContentConversationsServiceInterface['submitReply']
        getRepliesByAnnotation: ContentConversationStorage['getRepliesByAnnotation']
        getSharedAnnotationLinkID: ContentSharingStorage['getSharedAnnotationLinkID']
        getOrCreateConversationThread: ContentConversationStorage['getOrCreateThread']
        getCurrentUser(): Promise<(User & { reference: UserReference }) | null>
        loadUserByReference(reference: UserReference): Promise<User | null>
        isAuthorizedToConverse(): Promise<boolean>
        selectAnnotationData(
            state: State,
            reference: SharedAnnotationReference,
        ): {
            pageCreatorReference: UserReference
            normalizedPageUrl: string
        } | null
        onNewAnnotationCreate?(
            pageReplyId: string,
            annotation: SharedAnnotation & {
                reference: SharedAnnotationReference
                creator: UserReference
                linkId: string
            },
            annotationListEntry?: SharedAnnotationListEntry & {
                reference: SharedAnnotationListEntryReference
                sharedList: SharedListReference
            },
        ): void
    },
): AnnotationConversationsHandlers {
    return {
        toggleAnnotationReplies: async ({ event, previousState }) => {
            const annotationId = dependencies.getSharedAnnotationLinkID(
                event.annotationReference,
            )
            const conversationId = event.conversationId ?? annotationId
            const conversation = previousState.conversations[conversationId]

            const user = await dependencies.getCurrentUser()

            logic.emitMutation({
                conversations: {
                    [conversationId]: {
                        expanded: { $set: !conversation.expanded },
                        newReply: {
                            $set: { ...conversation.newReply, editing: !!user },
                        },
                    },
                },
            })
            if (conversation.loadState !== 'pristine') {
                return
            }

            await executeUITask<AnnotationConversationsState>(
                logic,
                (taskState) => ({
                    conversations: {
                        [conversationId]: { loadState: { $set: taskState } },
                    },
                }),
                async () => {
                    const replies = await dependencies.getRepliesByAnnotation({
                        annotationReference: event.annotationReference!,
                    })
                    return {
                        mutation: {
                            conversations: {
                                [conversationId]: {
                                    replies: {
                                        $set: await Promise.all(
                                            replies.map(async (reply) => ({
                                                ...reply,
                                                user: await dependencies.loadUserByReference(
                                                    reply.userReference,
                                                ),
                                            })),
                                        ),
                                    },
                                },
                            },
                        },
                    }
                },
            )
        },
        initiateNewReplyToAnnotation: async ({ event }) => {
            const user = await dependencies.getCurrentUser()
            if (!user) {
                logic.emitSignal<AnnotationConversationSignal>({
                    type: 'auth-requested',
                })

                if (!(await dependencies.isAuthorizedToConverse())) {
                    return {}
                }
            }

            const annotationId = dependencies.getSharedAnnotationLinkID(
                event.annotationReference,
            )
            const conversationId = event.conversationId ?? annotationId
            return {
                conversations: {
                    [conversationId]: {
                        expanded: { $set: true },
                        newReply: { editing: { $set: true } },
                    },
                },
            }
        },
        editNewReplyToAnnotation: ({ event }) => {
            const annotationId = dependencies.getSharedAnnotationLinkID(
                event.annotationReference,
            )
            const conversationId = event.conversationId ?? annotationId
            return {
                conversations: {
                    [conversationId]: {
                        newReply: { content: { $set: event.content } },
                    },
                },
            }
        },
        cancelNewReplyToAnnotation: ({ event }) => {
            const annotationId = dependencies.getSharedAnnotationLinkID(
                event.annotationReference,
            )
            const conversationId = event.conversationId ?? annotationId
            return {
                conversations: {
                    [conversationId]: {
                        newReply: { editing: { $set: false } },
                    },
                },
            }
        },
        confirmNewReplyToAnnotation: async ({ event, previousState }) => {
            const annotationId = dependencies.getSharedAnnotationLinkID(
                event.annotationReference,
            )
            const conversationId = event.conversationId ?? annotationId
            const annotationData = dependencies.selectAnnotationData(
                previousState as any,
                event.annotationReference,
            )
            const conversation = previousState.conversations[conversationId]
            const user = await dependencies.getCurrentUser()
            if (!annotationData) {
                throw new Error(`Could not find annotation to sumbit reply to`)
            }
            const { pageCreatorReference } = annotationData
            if (!pageCreatorReference) {
                throw new Error(`Could not find annotation to sumbit reply to`)
            }
            if (!conversation) {
                throw new Error(`Could not find annotation to sumbit reply to`)
            }
            if (!user) {
                throw new Error(
                    `Tried to submit a reply without being authenticated`,
                )
            }

            const lastReply = conversation.replies.length
                ? conversation.replies[conversation.replies.length - 1]
                : null

            await executeUITask<AnnotationConversationsState>(
                logic,
                (taskState) => ({
                    conversations: {
                        [conversationId]: {
                            newReply: { saveState: { $set: taskState } },
                        },
                    },
                }),
                async () => {
                    logic.emitSignal<AnnotationConversationSignal>({
                        type: 'reply-submitting',
                    })
                    const result = await dependencies.submitNewReply({
                        annotationReference: event.annotationReference,
                        normalizedPageUrl: annotationData.normalizedPageUrl,
                        pageCreatorReference,
                        reply: { content: conversation.newReply.content },
                        previousReplyReference: lastReply?.reference ?? null,
                    })
                    if (result.status === 'not-authenticated') {
                        return { status: 'pristine' }
                    }
                    if (result.status === 'failure') {
                        return { status: 'error' }
                    }
                    logic.emitMutation({
                        conversations: {
                            [conversationId]: {
                                newReply: { $set: getInitialNewReplyState() },
                                replies: {
                                    $push: [
                                        {
                                            reference: result.replyReference,
                                            reply: {
                                                createdWhen: Date.now(),
                                                normalizedPageUrl:
                                                    annotationData.normalizedPageUrl,
                                                content:
                                                    conversation.newReply
                                                        .content,
                                            },
                                            user: user,
                                        },
                                    ],
                                },
                            },
                        },
                    })
                },
            )
        },
        initiateNewReplyToPage: async ({ event }) => {
            const user = dependencies.getCurrentUser()
            if (!user) {
                logic.emitSignal<AnnotationConversationSignal>({
                    type: 'auth-requested',
                })

                if (!(await dependencies.isAuthorizedToConverse())) {
                    return {}
                }
            }

            return {
                newPageReplies: {
                    [event.pageReplyId]: {
                        editing: { $set: true },
                    },
                },
            }
        },
        editNewReplyToPage: ({ event }) => ({
            newPageReplies: {
                [event.pageReplyId]: {
                    content: { $set: event.content },
                },
            },
        }),
        cancelNewReplyToPage: ({ event }) => ({
            newPageReplies: {
                [event.pageReplyId]: {
                    $set: getInitialNewReplyState(),
                },
            },
        }),
        confirmNewReplyToPage: async ({ event, previousState }) => {
            const {
                getOrCreateConversationThread,
                getSharedAnnotationLinkID,
                onNewAnnotationCreate,
                createAnnotations,
                getCurrentUser,
            } = dependencies

            const user = await getCurrentUser()
            if (!user || !createAnnotations) {
                return
            }

            const comment = previousState.newPageReplies[
                event.pageReplyId
            ].content.trim()
            const createdWhen = Date.now()
            const listReferences = event.sharedListReference
                ? [event.sharedListReference]
                : []

            const annotation: SharedAnnotation = {
                normalizedPageUrl: event.normalizedPageUrl,
                uploadedWhen: createdWhen,
                updatedWhen: createdWhen,
                createdWhen,
                comment,
            }

            await executeUITask<AnnotationConversationsState>(
                logic,
                (taskState) => ({
                    newPageReplies: {
                        [event.pageReplyId]: {
                            saveState: { $set: taskState },
                        },
                    },
                }),
                async () => {
                    logic.emitSignal<AnnotationConversationSignal>({
                        type: 'new-note-submitting',
                    })
                    const localId = 'dummy'
                    const {
                        sharedAnnotationReferences,
                        sharedAnnotationListEntryReferences,
                    } = await createAnnotations({
                        listReferences,
                        creator: user.reference,
                        annotationsByPage: {
                            [event.normalizedPageUrl]: [
                                { ...annotation, localId },
                            ],
                        },
                    })

                    const annotationReference =
                        sharedAnnotationReferences[localId]

                    await getOrCreateConversationThread({
                        annotationReference,
                        normalizedPageUrl: event.normalizedPageUrl,
                        pageCreatorReference: event.pageCreatorReference,
                        sharedListReference: event.sharedListReference ?? null,
                    })

                    logic.emitMutation({
                        newPageReplies: {
                            [event.pageReplyId]: {
                                $set: getInitialNewReplyState(),
                            },
                        },
                        conversations: {
                            [annotationReference.id]: {
                                $set: getInitialAnnotationConversationState(),
                            },
                        },
                    })

                    onNewAnnotationCreate?.(
                        event.pageReplyId,
                        {
                            ...annotation,
                            creator: user.reference,
                            reference: annotationReference,
                            linkId: getSharedAnnotationLinkID(
                                annotationReference,
                            ),
                        },
                        event.sharedListReference && {
                            createdWhen,
                            updatedWhen: createdWhen,
                            uploadedWhen: createdWhen,
                            sharedList: event.sharedListReference,
                            normalizedPageUrl: event.normalizedPageUrl,
                            reference:
                                sharedAnnotationListEntryReferences[localId][0],
                        },
                    )
                },
            )
        },
    }
}
