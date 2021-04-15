import React from 'react'
import styled, { CSSObject } from 'styled-components'
import { IconKeys } from '../styles/types'

const StyledIcon = styled.div<{
    icon: string
    height: string
    width: string
    color?: string
}>`
    cursor: pointer;
    height: ${(props) => props.height};
    width: ${(props) => props.width};
    background-color: ${(props) => props.theme.colors[props.color] ?? props.color}};
    mask-position: center;
    mask-size: contain;
    mask-repeat: no-repeat;
    mask-image: url(${(props) =>
        props.theme.icons[props.icon] ?? props.icon});
`

export type IconProps = {
    height: string
    width?: string
    color?: string
    onClick?: React.MouseEventHandler
} & ({ icon: IconKeys } | { filePath: string })

export default function Icon(props: IconProps) {
    const icon = 'filePath' in props ? props.filePath : props.icon

    const width = props.width ?? props.height
    return (
        <StyledIcon
            {...props}
            height={props.height}
            width={width}
            icon={icon}
            color={color}
        />     
    )
}
