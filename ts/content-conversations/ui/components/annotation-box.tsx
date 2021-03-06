import DOMPurify from 'dompurify'
import React, { ReactNode } from 'react'
import styled from 'styled-components'
import { Margin } from 'styled-components-spacing'

import { User } from '../../../web-interface/types/users'
import { SharedAnnotation } from '../../../content-sharing/types'
import ItemBox from '../../../common-ui/components/item-box'
import ItemBoxBottom from '../../../common-ui/components/item-box-bottom'
import Markdown from '../../../common-ui/components/markdown'

const StyledAnnotationBox = styled.div`
    font-family: ${(props) => props.theme.fonts.primary};
`

const HighlightBox = styled(Margin)`
    display: flex;
    align-items: center;
    padding: 10px 15px 10px 15px;
    width: 100%;
`

const AnnotationBody = styled.span`
    white-space: normal;
    background-color: #d4e8ff;
    padding: 1px 5px;
    box-decoration-break: clone;
    font-size: 14px;
    color: ${(props) => props.theme.colors.primary};
    font-weight: 400;
`

const AnnotationComment = styled.div`
    font-size: 14px;
    color: ${(props) => props.theme.colors.primary};
    padding: 10px 15px;

    & *:first-child {
        margin-top: 0;
    }

    & *:last-child {
        margin-bottom: 0;
    }

    & * {
        word-break: break-word;
    }
`

const Separator = styled.div`
    border-top: 0.5px solid #e0e0e0;
`

const AnnotationTopBox = styled.div`
    padding: 5px 0 0 0;
    display: flex;
    flex-direction: column;
`

const DOM_PURIFY_CONFIG: DOMPurify.Config = {
    ALLOWED_TAGS: ['p', 'br', '#text'],
    ALLOWED_ATTR: [],
}

const preserveLinebreaks = (s: string | undefined) =>
    s
        ? (DOMPurify.sanitize(
              s.trim().replace(/\n/g, '<br>'),
              DOM_PURIFY_CONFIG,
          ) as string)
        : ''

export interface AnnotationBoxProps {
    annotation: Pick<SharedAnnotation, 'body' | 'comment' | 'createdWhen'>
    creator?: Pick<User, 'displayName'> | null
    hasReplies?: boolean
    areRepliesExpanded?: boolean
    renderCreationInfo?: (props: { children: ReactNode }) => ReactNode
    onInitiateReply?(): void
    onToggleReplies?(): void
}

export default function AnnotationBox(props: AnnotationBoxProps) {
    const { annotation } = props
    return (
        <ItemBox>
            <StyledAnnotationBox>
                <AnnotationTopBox>
                    {annotation.body && (
                        <HighlightBox>
                            <Margin>
                                <AnnotationBody
                                    dangerouslySetInnerHTML={{
                                        __html: preserveLinebreaks(
                                            annotation.body,
                                        ),
                                    }}
                                />
                            </Margin>
                        </HighlightBox>
                    )}
                    {annotation.body && annotation.comment && <Separator />}
                    {annotation.comment && (
                        <Margin>
                            <AnnotationComment>
                                <Markdown>{annotation.comment}</Markdown>
                            </AnnotationComment>
                        </Margin>
                    )}
                </AnnotationTopBox>
                <ItemBoxBottom
                    renderCreationInfo={props.renderCreationInfo}
                    creationInfo={{
                        createdWhen: annotation.createdWhen,
                        creator: props.creator,
                    }}
                    actions={[
                        props.onToggleReplies && {
                            key: 'toggle-replies',
                            onClick: props.onToggleReplies,
                            image: props.hasReplies
                                ? 'comment'
                                : 'commentEmpty',
                        },
                    ]}
                />
            </StyledAnnotationBox>
        </ItemBox>
    )
}
