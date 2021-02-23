import React, { HTMLProps } from 'react'
import styled from 'styled-components'
import Margin from '../components/Margin'

export type ItemBoxVariant = 'new-item'

const StyledItemBox = styled.div<{ variant?: ItemBoxVariant }>`
    font-family: ${(props) => props.theme.fonts.primary};
    background: #ffffff;
    box-sizing: border-box;
    box-shadow: rgb(0 0 0 / 10%) 0px 1px 2px 0px;
    border-radius: 5px;
    text-decoration: none;
    width: 100%;
`

export default function ItemBox(props: {
    children: React.ReactNode
    variant?: ItemBoxVariant
    firstDivProps?: HTMLProps<HTMLDivElement>
}) {
    return (
        <StyledItemBox variant={props.variant} {...(props.firstDivProps ?? {})}>
            {props.children}
        </StyledItemBox>
    )
}
