import omit from 'lodash/omit'
import expect from 'expect'
import { concretizeActivity } from "./utils"
import { SharedAnnotationReference, SharedPageInfoReference } from "../content-sharing/types"
import { ConversationReplyReference } from "../content-conversations/types"
import { UserReference } from 'src/web-interface/types/users'
import { prepareActivityForStreamIO } from './getstream'

describe('Activity stream utils', () => {
    it('should correctly concretize annotation reply activities', async () => {
        const annotationReference: SharedAnnotationReference = { type: 'shared-annotation-reference', id: 'sar5' }
        const replyReference: ConversationReplyReference = { type: 'conversation-reply-reference', id: 'crr5' }
        const activityBase = {
            entityType: 'sharedAnnotation' as 'sharedAnnotation',
            entity: annotationReference,
            activityType: 'conversationReply' as 'conversationReply',
            activity: {
                replyReference
            }
        }
        const normalizedPageUrl = 'ccc.com'
        const annotation = {
            createdWhen: Date.now(),
            updatedWhen: Date.now(),
            uploadedWhen: Date.now(),
            body: 'body',
            normalizedPageUrl,
        }
        const pageInfo = {
            createdWhen: Date.now(),
            updatedWhen: Date.now(),
            uploadedWhen: Date.now(),
            fullTitle: 'full title',
            normalizedUrl: normalizedPageUrl,
            originalUrl: 'https://ccc.com'
        }
        const reply = {
            createdWhen: Date.now(),
            content: 'reply content',
            normalizedPageUrl
        }
        const annotationCreatorReference: UserReference = { type: 'user-reference', 'id': 'annot-creator' }
        const pageInfoReference: SharedPageInfoReference = { type: 'shared-page-info-reference', id: 'the-page' }
        const replyUserReference: UserReference = { type: 'user-reference', id: 'reply-creator' }
        const concretized = await concretizeActivity({
            storage: {
                contentSharing: {
                    getAnnotation: async () => ({
                        creatorReference: annotationCreatorReference,
                        annotation,
                    }),
                    getPageInfoByCreatorAndUrl: async () => ({
                        reference: pageInfoReference,
                        pageInfo
                    }),
                },
                contentConversations: {
                    getReply: async () => ({
                        reference: replyReference,
                        reply: reply,
                        sharedAnnotation: annotationReference,
                        userReference: replyUserReference,
                    }),
                },
                users: {
                    getUser: async (reference) => ({ displayName: `Name: ${reference.id}` })
                }
            },
            ...activityBase,
        })
        expect(concretized).toEqual({
            activityType: activityBase.activityType,
            activity: {
                normalizedPageUrl,
                pageInfo: {
                    reference: pageInfoReference,
                    ...pageInfo,
                },
                annotation: {
                    reference: annotationReference,
                    ...annotation,
                },
                annotationCreator: {
                    reference: annotationCreatorReference,
                    displayName: 'Name: annot-creator'
                },
                reply: {
                    reference: replyReference,
                    ...reply,
                },
                replyCreator: {
                    reference: replyUserReference,
                    displayName: 'Name: reply-creator'
                }
            },
        })
        expect(prepareActivityForStreamIO(concretized as any, {
            makeReference: (collection, id) => `ref:${collection}:${id}`
        })).toEqual({
            "activity": {
                "data_annotation": "ref:sharedAnnotation:sar5",
                "data_annotationCreator": "ref:user:annot-creator",
                "data_normalizedPageUrl": "ccc.com",
                "data_pageInfo": "ref:sharedPageInfo:the-page",
                "data_reply": "ref:conversationReply:crr5",
                "data_replyCreator": "ref:user:reply-creator",
            },
            "objects": {
                "conversationReply": [{
                    id: 'crr5',
                    reference: "ref:conversationReply:crr5",
                    data: reply,
                }],
                "sharedAnnotation": [{
                    id: 'sar5',
                    reference: "ref:sharedAnnotation:sar5",
                    data: annotation,
                }],
                "sharedPageInfo": [{
                    id: 'the-page',
                    reference: "ref:sharedPageInfo:the-page",
                    data: pageInfo,
                }],
                "user": [
                    {
                        id: 'reply-creator',
                        reference: "ref:user:reply-creator",
                        data: {
                            "displayName": concretized.activity.replyCreator.displayName,
                        },
                    },
                    {
                        id: 'annot-creator',
                        reference: "ref:user:annot-creator",
                        data: {
                            "displayName": concretized.activity.annotationCreator.displayName,
                        }
                    },
                ]
            },
        })
    })
})
