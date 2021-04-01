import React from 'react'
import styled, { CSSObject } from 'styled-components'
import { IconKeys } from '../styles/types'

const StyledIcon = styled.div<{
    icon: CSSObject
    height: string
    width: string
}>`
    cursor: pointer;
    height: ${(props) => props.height};
    width: ${(props) => props.width};
    background-position: center;
    background-size: contain;
    background-repeat: no-repeat;
    background-image: url(${(props) =>
        props.theme.icons[props.icon] ?? props.icon});
`

export type IconProps = {
    height: string
    width?: string
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
        />
    )
}
