import React from 'react'
import styled from 'styled-components'
import { Margin } from 'styled-components-spacing'

import { UITaskState } from '../../../main-ui/types'
import LoadingIndicator from '../../../common-ui/components/loading-indicator'
import ErrorBox from '../../../common-ui/components/error-box'
import { SharedAnnotationReference } from '../../../content-sharing/types'
import AnnotationBox from './annotation-box'
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

interface SharedProps {
    hideNewReplyIfNotEditing?: boolean
    getReplyCreator?: (
        annotationReference: SharedAnnotationReference,
        replyReference: ConversationReplyReference,
    ) => Pick<User, 'displayName'> | null | undefined
    renderBeforeReplies?: (
        annotationReference: SharedAnnotationReference,
    ) => React.ReactNode
    renderReply?: (
        props: {
            annotationReference: SharedAnnotationReference
            replyReference: ConversationReplyReference
        } & AnnotationReplyProps,
    ) => React.ReactNode
    renderCreationInfo?: (
        userReference: UserReference,
    ) => (props: { children: React.ReactNode }) => React.ReactNode
    renderReplyBox?: (props: {
        annotationReference: SharedAnnotationReference
        replyReference: ConversationReplyReference
        children: React.ReactNode
    }) => React.ReactNode
}

export interface AnnotationsInPageProps extends SharedProps {
    loadState: UITaskState
    newPageReply?: NewReplyState
    newPageReplyEventHandlers: NewReplyEventHandlers
    newAnnotationReplyEventHandlers: NewAnnotationReplyEventHandlers
    annotations?: Array<SharedAnnotationInPage | null> | null
    annotationConversations?: AnnotationConversationStates | null

    onToggleReplies(event: {
        annotationReference: SharedAnnotationReference
    }): void
    getAnnotationConversation?: (
        annotationReference: SharedAnnotationReference,
    ) => AnnotationConversationState | null
    getAnnotationCreator: (
        annotationReference: SharedAnnotationReference,
    ) => Pick<User, 'displayName'> | null | undefined
    getAnnotationCreatorRef: (
        annotationReference: SharedAnnotationReference,
    ) => UserReference | null | undefined
}

export default function AnnotationsInPage(props: AnnotationsInPageProps) {
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

    const renderAnnotationWithReplies = (
        annotation: SharedAnnotationInPage,
    ) => {
        const { newAnnotationReplyEventHandlers: replyHandlers } = props
        const conversation =
            props.getAnnotationConversation?.(annotation.reference) ??
            props.annotationConversations?.[annotation.linkId]
        const annotationCreator = props.getAnnotationCreator(
            annotation.reference,
        )
        const annotationCreatorRef = props.getAnnotationCreatorRef(
            annotation.reference,
        )
        const onNewReplyInitiate = replyHandlers.onNewReplyInitiate?.(
            annotation.reference,
        )
        return (
            <Margin key={annotation.linkId} bottom={'small'} top={'small'}>
                <AnnotationBox
                    annotation={annotation}
                    creator={annotationCreator}
                    hasReplies={!!conversation?.thread || annotation.hasThread}
                    onInitiateReply={onNewReplyInitiate}
                    onToggleReplies={() =>
                        props.onToggleReplies({
                            annotationReference: annotation.reference,
                        })
                    }
                    renderCreationInfo={props.renderCreationInfo?.(
                        annotationCreatorRef,
                    )}
                />
                <ConversationReplies
                    {...props}
                    annotation={annotation}
                    conversation={conversation}
                    onNewReplyInitiate={onNewReplyInitiate}
                    onNewReplyConfirm={replyHandlers.onNewReplyConfirm?.(
                        annotation.reference,
                    )}
                    onNewReplyCancel={replyHandlers.onNewReplyCancel?.(
                        annotation.reference,
                    )}
                    onNewReplyEdit={replyHandlers.onNewReplyEdit?.(
                        annotation.reference,
                    )}
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
                            annotation &&
                            renderAnnotationWithReplies(annotation),
                    )}
                </AnnotationList>
            )}
        </AnnotationContainer>
    )
}

export function ConversationReplies({
    annotation,
    conversation,
    ...props
}: {
    annotation: SharedAnnotationInPage
    conversation?: AnnotationConversationState
} & SharedProps &
    NewReplyEventHandlers) {
    const renderReply =
        props.renderReply ?? ((props) => <AnnotationReply {...props} />)

    if (!conversation?.expanded) {
        return null
    }

    if (conversation.loadState === 'running') {
        return (
            <Margin left="small">
                <ReplyContainer>
                    <CenteredContent>
                        <LoadingIndicator />
                    </CenteredContent>
                </ReplyContainer>
            </Margin>
        )
    }

    return (
        <>
            {props.renderBeforeReplies && (
                <Margin left="small">
                    <ReplyContainer>
                        {props.renderBeforeReplies(annotation.reference)}
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
                    renderCreationInfo: props.renderCreationInfo?.(
                        replyData.creatorReference ?? null,
                    ),
                    renderItemBox:
                        props.renderReplyBox &&
                        ((boxProps) =>
                            props.renderReplyBox?.({
                                annotationReference: annotation.reference,
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
    )
}
