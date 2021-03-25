import React from 'react'
import styled, { CSSObject } from 'styled-components'

const StyledIcon = styled.div<{
    icon: CSSObject
    height: string
    width: string
}>`
    height: ${(props) => props.height};
    width: ${(props) => props.width};
    background-position: center;
    background-size: contain;
    background-repeat: no-repeat;
    background-image: url(${(props) => props.icon});
    cursor: pointer;
`

export type IconProps = {
    height: string
    width?: string
    onClick?: React.MouseEventHandler
} & ({ fileName: string } | { filePath: string })

export default function Icon(props: IconProps) {
    const icon =
        'filePath' in props
            ? props.filePath
            : require(`../../assets/img/${props.fileName}`)

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
