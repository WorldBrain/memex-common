import React from 'react'
import styled from 'styled-components'
import { Margin } from 'styled-components-spacing'

import { UITaskState } from '../../../main-ui/types'
import LoadingIndicator from '../../../common-ui/components/loading-indicator'
import ErrorBox from '../../../common-ui/components/error-box'
import { SharedAnnotationReference } from '../../../content-sharing/types'
import AnnotationBox, { AnnotationBoxProps } from './annotation-box'
import {
    AnnotationConversationStates,
    AnnotationConversationState,
    NewReplyState,
} from '../types'
import { User, UserReference } from '../../../web-interface/types/users'
import AnnotationReply, { AnnotationReplyProps } from './annotation-reply'
import NewReply, { NewReplyEventHandlers } from './new-reply'
import { SharedAnnotationInPage } from './types'
import { ConversationReplyReference } from '../../types'

// TODO: This file needs refactoring; it is too complicated

const AnnotationContainer = styled(Margin)`
    display: flex;
    flex-direction: column;
    justify-content: center;
`

const ReplyContainer = styled.div`
    padding-top: 0.5rem;
    border-left: 4px solid #e0e0e0;
    padding-left: 10px;
`

const AnnotationList = styled.div`
    min-height: 60px;
    width: 100%;
    border-left: 4px solid #e0e0e0;
    padding-left: 10px;
`

const CenteredContent = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
`

export type NewAnnotationReplyEventHandlers = {
    [name in keyof NewReplyEventHandlers]: (
        annotationReference: SharedAnnotationReference,
    ) => NewReplyEventHandlers[name]
}

export interface Props {
    loadState: UITaskState
    newPageReply?: NewReplyState
    newPageReplyEventHandlers: NewReplyEventHandlers
    newAnnotationReplyEventHandlers: NewAnnotationReplyEventHandlers
    annotations?: Array<SharedAnnotationInPage | null> | null
    annotationConversations?: AnnotationConversationStates | null
    renderAnnotationBox?: (
        props: AnnotationBoxProps & { annotation: SharedAnnotationInPage },
    ) => React.ReactNode
    getAnnotationConversation?: (
        annotationReference: SharedAnnotationReference,
    ) => AnnotationConversationState | null
    hideNewReplyIfNotEditing?: boolean
    getAnnotationCreator?: (
        annotationReference: SharedAnnotationReference,
    ) => Pick<User, 'displayName'> | null | undefined
    getAnnotationCreatorRef?: (
        annotationReference: SharedAnnotationReference,
    ) => UserReference | null | undefined
    getReplyCreator?: (
        annotationReference: SharedAnnotationReference,
        replyReference: ConversationReplyReference,
    ) => Pick<User, 'displayName'> | null | undefined
    renderCreationInfo: (
        customUserReference: UserReference,
    ) => (props: { children: React.ReactNode }) => React.ReactNode
    renderBeforeReplies?: (
        annotationReference: SharedAnnotationReference,
    ) => React.ReactNode
    renderReply?: (
        props: {
            annotationReference: SharedAnnotationReference
            replyReference: ConversationReplyReference
        } & AnnotationReplyProps,
    ) => React.ReactNode
    renderReplyBox?: (props: {
        annotationReference: SharedAnnotationReference
        replyReference: ConversationReplyReference
        children: React.ReactNode
    }) => React.ReactNode
    onToggleReplies?(event: {
        annotationReference: SharedAnnotationReference
    }): void
}

export default function AnnotationsInPage(props: Props) {
    if (props.loadState === 'pristine' || props.loadState === 'running') {
        return (
            <AnnotationContainer left="small" bottom="large">
                <AnnotationList>
                    <CenteredContent>
                        <LoadingIndicator />
                    </CenteredContent>
                </AnnotationList>
            </AnnotationContainer>
        )
    }

    if (props.loadState === 'error') {
        return (
            <AnnotationContainer>
                <CenteredContent>
                    <Margin bottom={'medium'}>
                        <ErrorBox>
                            Error loading page notes. <br /> Reload page to
                            retry.
                        </ErrorBox>
                    </Margin>
                </CenteredContent>
            </AnnotationContainer>
        )
    }

    const renderAnnotation = (annotation: SharedAnnotationInPage) => {
        const { newAnnotationReplyEventHandlers: replyHandlers } = props
        const conversation =
            props.getAnnotationConversation?.(annotation.reference) ??
            props.annotationConversations?.[annotation.linkId]
        return (
            <Margin key={annotation.linkId} bottom={'small'} top={'small'}>
                <AnnotationWithReplies
                    {...props}
                    onNewReplyInitiate={replyHandlers.onNewReplyInitiate?.(
                        annotation.reference,
                    )}
                    onNewReplyConfirm={replyHandlers.onNewReplyConfirm?.(
                        annotation.reference,
                    )}
                    onNewReplyCancel={replyHandlers.onNewReplyCancel?.(
                        annotation.reference,
                    )}
                    onNewReplyEdit={replyHandlers.onNewReplyEdit?.(
                        annotation.reference,
                    )}
                    annotation={annotation}
                    annotationCreator={props.getAnnotationCreator?.(
                        annotation.reference,
                    )}
                    annotationCreatorRef={props.getAnnotationCreatorRef?.(
                        annotation.reference,
                    )}
                    conversation={conversation}
                    renderReplyBox={props.renderReplyBox}
                    hideNewReplyIfNotEditing={props.hideNewReplyIfNotEditing}
                />
            </Margin>
        )
    }

    return (
        <AnnotationContainer left="small" bottom="large">
            {props.newPageReply && (
                <ReplyContainer>
                    <NewReply
                        {...props.newPageReplyEventHandlers}
                        placeholder="Add a note to this page"
                        newReply={props.newPageReply}
                    />
                </ReplyContainer>
            )}
            {props.annotations && (
                <AnnotationList>
                    {props.annotations.map(
                        (annotation) =>
                            annotation && renderAnnotation(annotation),
                    )}
                </AnnotationList>
            )}
        </AnnotationContainer>
    )
}

export function AnnotationWithReplies(
    props: {
        annotation: SharedAnnotationInPage
        annotationCreator?: Pick<User, 'displayName'> | null
        annotationCreatorRef?: UserReference
        renderAnnotationBox?: (
            props: AnnotationBoxProps & { annotation: SharedAnnotationInPage },
        ) => React.ReactNode
        conversation?: AnnotationConversationState
        hideNewReplyIfNotEditing?: boolean
        getReplyCreator?: (
            annotationReference: SharedAnnotationReference,
            replyReference: ConversationReplyReference,
        ) => Pick<User, 'displayName'> | null | undefined
        onToggleReplies?(event: {
            annotationReference: SharedAnnotationReference
        }): void
        renderBeforeReplies?: (
            annotationReference: SharedAnnotationReference,
        ) => React.ReactNode
        renderReply?: (
            props: {
                annotationReference: SharedAnnotationReference
                replyReference: ConversationReplyReference
            } & AnnotationReplyProps,
        ) => React.ReactNode
        renderCreationInfo: (
            userReference: UserReference,
        ) => (props: { children: React.ReactNode }) => React.ReactNode
        renderReplyBox?: (props: {
            annotationReference: SharedAnnotationReference
            replyReference: ConversationReplyReference
            children: React.ReactNode
        }) => React.ReactNode
    } & NewReplyEventHandlers,
) {
    const { annotation, conversation } = props

    const renderReply =
        props.renderReply ?? ((props) => <AnnotationReply {...props} />)

    return (
        <>
            <AnnotationBox
                annotation={annotation}
                creator={props.annotationCreator}
                hasReplies={!!conversation?.thread || annotation.hasThread}
                renderCreationInfo={props.renderCreationInfo(
                    props.annotationCreatorRef ?? {
                        type: 'user-reference',
                        id: '',
                    },
                )}
                onInitiateReply={() => props.onNewReplyInitiate?.()}
                onToggleReplies={() =>
                    props.onToggleReplies?.({
                        annotationReference: annotation.reference,
                    })
                }
            />
            {conversation && conversation.expanded && (
                <>
                    {props.renderBeforeReplies && (
                        <Margin left="small">
                            <ReplyContainer>
                                {props.renderBeforeReplies(
                                    annotation.reference,
                                )}
                            </ReplyContainer>
                        </Margin>
                    )}
                    {conversation.replies?.map?.((replyData) => {
                        const renderedReply = renderReply({
                            ...replyData,
                            annotationReference: annotation.reference,
                            replyReference: replyData.reference,
                            user:
                                props.getReplyCreator?.(
                                    annotation.reference,
                                    replyData.reference,
                                ) ?? replyData.user,
                            renderCreationInfo: props.renderCreationInfo(
                                replyData.creatorReference ?? null,
                            ),
                            renderItemBox:
                                props.renderReplyBox &&
                                ((boxProps) =>
                                    props.renderReplyBox?.({
                                        annotationReference:
                                            annotation.reference,
                                        replyReference: replyData.reference,
                                        ...boxProps,
                                    })),
                        })
                        if (!renderedReply) {
                            return null
                        }
                        return (
                            <Margin left="small" key={replyData.reference.id}>
                                <ReplyContainer>{renderedReply}</ReplyContainer>
                            </Margin>
                        )
                    })}
                    {(conversation.newReply.editing ||
                        !props.hideNewReplyIfNotEditing) && (
                        <Margin left="small">
                            <ReplyContainer>
                                <NewReply
                                    {...props}
                                    placeholder="Add a new reply"
                                    newReply={conversation.newReply}
                                />
                            </ReplyContainer>
                        </Margin>
                    )}
                </>
            )}
        </>
    )
}
