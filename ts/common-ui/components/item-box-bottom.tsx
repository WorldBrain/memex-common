import React, { HTMLProps } from 'react'
import styled from 'styled-components'
import Margin from '../components/Margin'
import CreationInfo, { CreationInfoProps } from './creation-info'
import ButtonTooltip from './button-tooltip'

const Bottom = styled.div`
    display: flex;
    flex-direction: row;
    height: 40px;
    justify-content: space-between;
    padding: 0 15px;
    width: fill-available;
    align-items: center;
    border-top: 1px solid #e0e0e0;
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
    opacity: ${(props) => (props.isDisabled ? 0.35 : 1)};
    cursor: ${(props) => (props.isDisabled ? 'default' : 'pointer')};
    background-image: url('${(props) =>
        props.theme.icons[props.image] ?? props.image}');
    background-size: auto 14px;
    background-position: center center;
    background-repeat: no-repeat;
`

const ActionNode = styled.div`
    display: block;
    width: 20px;
    height: 20px !important;
`

export type AllowedDivProps = Pick<
    HTMLProps<HTMLDivElement>,
    'onMouseLeave' | 'onMouseEnter' | 'onDragStart' | 'onDragEnd' | 'id'
>

export type ItemBoxBottomAction =
    | {
          key: string
          image: string
          isDisabled?: boolean
          tooltipText?: string
          onClick?: React.MouseEventHandler<HTMLDivElement>
      }
    | { node: React.ReactNode }
    | null
    | false
    | undefined

export interface ItemBoxBottomProps {
    creationInfo: CreationInfoProps
    replyCount?: number
    firstDivProps?: AllowedDivProps
    actions?: Array<ItemBoxBottomAction>
    renderCreationInfo?: (props: {
        children: React.ReactNode
    }) => React.ReactNode
}

export default function ItemBoxBottom(props: ItemBoxBottomProps) {
    const creationInfo = <CreationInfo {...props.creationInfo} />
    return (
        <Bottom {...(props.firstDivProps ?? {})}>
            {props.renderCreationInfo
                ? props.renderCreationInfo({ children: creationInfo })
                : creationInfo}
            <Actions>
                {props.actions?.map?.(
                    (actionProps) =>
                        actionProps &&
                        ('node' in actionProps ? (
                            <ActionNode>{actionProps.node}</ActionNode>
                        ) : (
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
                        )),
                )}
            </Actions>
        </Bottom>
    )
}
