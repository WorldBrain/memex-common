import React from 'react'
import styled from 'styled-components'
import { Margin } from 'styled-components-spacing'
import CreationInfo, { CreationInfoProps } from './creation-info'

const Bottom = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 0px 15px 0px 15px;
    border-top: 1px solid #e0e0e0;
    height: 40px;
`

const Actions = styled.div`
    display: flex;
    flex-grow: 2;
    align-items: flex-end;
    justify-content: flex-end;
`
const Action = styled.div<{ image: string }>`
    display: block;
    width: 20px;
    height: 20px;
    cursor: pointer;
    background-image: url('${(props) => props.image}');
    background-size: contain;
    background-position: center center;
    background-repeat: no-repeat;
`

export interface ItemBoxBottomProps {
    creationInfo: CreationInfoProps
    replyCount?: number
    actions?: Array<
        | { key: string; image: string; onClick?(): void }
        | null
        | false
        | undefined
    >
    renderCreationInfo?: (props: { children: React.ReactNode }) => React.ReactNode
}

export default function ItemBoxBottom(props: ItemBoxBottomProps) {
    const renderCreationInfo = props.renderCreationInfo ?? ((props) => props.children)

    return (
        <Bottom>
            {renderCreationInfo({ children: <CreationInfo {...props.creationInfo} /> })}
            <Actions>
                {props.actions?.map?.(
                    (actionProps) =>
                        actionProps && (
                            <Margin key={actionProps.key} left="small">
                                <Action {...actionProps} />
                            </Margin>
                        ),
                )}
            </Actions>
        </Bottom>
    )
}
