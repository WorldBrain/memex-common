import expect from 'expect'
import { concretizeActivity } from "./utils"
import { SharedAnnotationReference, SharedPageInfoReference, SharedListReference, SharedListEntryReference, SharedAnnotation, SharedPageInfo, SharedListEntry, SharedList } from "../content-sharing/types"
import { ConversationReplyReference, ConversationReply } from "../content-conversations/types"
import { UserReference } from '../web-interface/types/users'
import { prepareActivityForStreamIO } from './services/getstream'

describe('Activity stream utils', () => {
    it('should correctly concretize annotation reply activities', async () => {
        const annotationReference: SharedAnnotationReference = { type: 'shared-annotation-reference', id: 'sar5' }
        const replyReference: ConversationReplyReference = { type: 'conversation-reply-reference', id: 'crr5' }
        const activityBase = {
            entityType: 'sharedAnnotation' as 'sharedAnnotation',
            entity: annotationReference,
            activityType: 'conversationReply' as 'conversationReply',
            activity: {
                replyReference,
                previousReplyReference: null,
            }
        }
        const normalizedPageUrl = 'ccc.com'
        const annotation: SharedAnnotation = {
            createdWhen: Date.now(),
            updatedWhen: Date.now(),
            uploadedWhen: Date.now(),
            body: 'body',
            normalizedPageUrl,
        }
        const pageInfo: SharedPageInfo = {
            createdWhen: Date.now(),
            updatedWhen: Date.now(),
            fullTitle: 'full title',
            normalizedUrl: normalizedPageUrl,
            originalUrl: 'https://ccc.com'
        }
        const reply: ConversationReply = {
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
                    getListByReference: async () => null,
                    getListEntryByReference: async () => null,
                },
                contentConversations: {
                    getReply: async () => ({
                        reference: replyReference,
                        reply: reply,
                        sharedAnnotation: annotationReference,
                        userReference: replyUserReference,
                        previousReply: null,
                    }),
                },
                users: {
                    getUser: async (reference) => ({ displayName: `Name: ${reference.id}` })
                }
            },
            ...activityBase,
        })
        expect(concretized).toEqual({
            activity: {
                normalizedPageUrl,
                previousReplyReference: null,
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
                "data_previousReplyReference": null,
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

    it('should correctly concretize list entry activities', async () => {
        const listReference: SharedListReference = { type: 'shared-list-reference', id: 'shared-list-ref' }
        const entryReference: SharedListEntryReference = { type: 'shared-list-entry-reference', id: 'entry-ref' }
        const normalizedPageUrl = 'ccc.com'
        const originalPageUrl = `https//www.${normalizedPageUrl}`
        const activityBase = {
            entityType: 'sharedList' as 'sharedList',
            entity: listReference,
            activityType: 'sharedListEntry' as 'sharedListEntry',
            activity: {
                entryReference,
            }
        }
        const list: SharedList = {
            createdWhen: Date.now(),
            updatedWhen: Date.now(),
            title: 'Some shared list',
            description: 'List descr'
        }
        const listEntry: SharedListEntry = {
            createdWhen: Date.now(),
            updatedWhen: Date.now(),
            normalizedUrl: normalizedPageUrl,
            originalUrl: originalPageUrl,
            entryTitle: 'Some new entry',
        }
        const listCreatorReference: UserReference = { type: 'user-reference', id: 'list-creator' }
        const entryCreatorReference: UserReference = { type: 'user-reference', id: 'entry-creator' }
        const concretized = await concretizeActivity({
            storage: {
                contentSharing: {
                    getAnnotation: async () => null,
                    getPageInfoByCreatorAndUrl: async () => null,
                    getListByReference: async () => ({
                        reference: listReference,
                        creator: listCreatorReference,
                        ...list
                    }),
                    getListEntryByReference: async () => ({
                        reference: entryReference,
                        creator: entryCreatorReference,
                        sharedList: listReference,
                        ...listEntry,
                    })
                },
                contentConversations: {
                    getReply: async () => null,
                },
                users: {
                    getUser: async (reference) => ({ displayName: `Name: ${reference.id}` })
                }
            },
            ...activityBase,
        })
        expect(concretized).toEqual({
            activity: {
                list: {
                    reference: listReference,
                    ...list,
                },
                listCreator: {
                    reference: listCreatorReference,
                    displayName: 'Name: list-creator'
                },
                entry: {
                    reference: entryReference,
                    ...listEntry,
                },
                entryCreator: {
                    reference: entryCreatorReference,
                    displayName: 'Name: entry-creator'
                }
            },
        })
        expect(prepareActivityForStreamIO(concretized as any, {
            makeReference: (collection, id) => `ref:${collection}:${id}`
        })).toEqual({
            "activity": {
                "data_entry": "ref:sharedListEntry:entry-ref",
                "data_entryCreator": "ref:user:entry-creator",
                "data_list": "ref:sharedList:shared-list-ref",
                "data_listCreator": "ref:user:list-creator",
            },
            "objects": {
                "sharedList": [
                    {
                        id: 'shared-list-ref',
                        reference: "ref:sharedList:shared-list-ref",
                        data: list,
                    }
                ],
                "sharedListEntry": [
                    {
                        id: 'entry-ref',
                        reference: "ref:sharedListEntry:entry-ref",
                        data: listEntry,
                    }
                ],
                "user": [
                    {
                        id: 'entry-creator',
                        reference: "ref:user:entry-creator",
                        data: {
                            "displayName": concretized.activity.entryCreator.displayName,
                        },
                    },
                    {
                        id: 'list-creator',
                        reference: "ref:user:list-creator",
                        data: {
                            "displayName": concretized.activity.listCreator.displayName,
                        }
                    },
                ]
            },
        })
    })
})
