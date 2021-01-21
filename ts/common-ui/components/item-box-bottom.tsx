import React from 'react'
import styled from 'styled-components'
import Margin from '../components/Margin'
import CreationInfo, { CreationInfoProps } from './creation-info'
import ButtonTooltip from './button-tooltip'

const Bottom = styled.div`
    display: flex;
    flex-direction: row;
    padding: 15px;
    align-items: center;
`

const Actions = styled.div`
    display: flex;
    flex-grow: 2;
    align-items: center;
    justify-content: flex-end;
`
const Action = styled.div<{ image: string; isDisabled?: boolean }>`
    display: block;
    width: 20px;
    height: 20px !important;
    cursor: ${(props) => (!props.isDisabled ? 'pointer' : 'default')};
    background-image: url("${(props) => props.image}");
    background-size: auto 14px;
    background-position: center center;
    background-repeat: no-repeat;
`

export default function ItemBoxBottom(props: {
    creationInfo: CreationInfoProps
    replyCount?: number
    actions?: Array<
        | {
              key: string
              image: string
              isDisabled?: boolean
              tooltipText?: string
              onClick?: React.MouseEventHandler<HTMLDivElement>
          }
        | null
        | false
        | undefined
    >
}) {
    return (
        <Bottom>
            <CreationInfo {...props.creationInfo} />
            <Actions>
                {props.actions?.map?.(
                    (actionProps) =>
                        actionProps && (
                            <Margin key={actionProps.key} left="5px">
                                {actionProps.tooltipText ? (
                                    <ButtonTooltip
                                        position="bottom"
                                        tooltipText={actionProps.tooltipText}
                                    >
                                        <Action {...actionProps} />
                                    </ButtonTooltip>
                                ) : (
                                    <Action {...actionProps} />
                                )}
                            </Margin>
                        ),
                )}
            </Actions>
        </Bottom>
    )
}
