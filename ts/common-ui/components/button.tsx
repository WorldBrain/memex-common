import React from 'react'
import styled, { css } from 'styled-components'

export interface ButtonProps {
    type: 'primary-action' | 'small' | 'alternative-small'
    isDisabled?: boolean
}

const VARIATIONS: {
    [Key in ButtonProps['type']]: ReturnType<typeof css>
} = {
    'primary-action': css`
        padding: 10px 10px;
        font-size: 14px;
        color: white;
        background-color: ${(props) => props.theme.colors.purple};
        padding: 8px 25px;
    `,
    small: css`
        padding: 3px 10px;
        font-size: 12px;
    `,
    'alternative-small': css`
        background-color: none !important;
        padding: 3px 10px;
        font-size: 12px;
        color: ${(props) => props.theme.colors.primary};
        background-color: none;
    `,
}

const StyledButton = (props: ButtonProps) => css`
    ${VARIATIONS[props.type]}
    display: flex;
    font-family: ${(props) => props.theme.fonts.primary};
    padding: ${props.type};
    text-align: center;
    font-weight: 500;
    border-radius: 3px;
    color: ${props.type};
    background-color: ${props.type};
    cursor: ${props.isDisabled ? 'not-allowed' : 'pointer'};
    white-space: nowrap;
    text-decoration: none;
    align-items: center;

    &:hover {
        opacity: 0.8;
    }
`

const ButtonWithOnClick = styled.div<ButtonProps>`
    ${(props) => StyledButton(props)}
`

const ButtonWithLink = styled.a<ButtonProps>`
    ${(props) => StyledButton(props)}
`

export default function Button(
    props: ButtonProps & {
        children: React.ReactNode
    } & (
            | {
                  onClick?: () => void
              }
            | {
                  externalHref: string
              }
        ),
) {
    const handleClick: React.MouseEventHandler = (e) => {
        if ('externalHref' in props) {
            if (props.isDisabled) {
                e.preventDefault()
            }
            return
        }

        if (!props.isDisabled) {
            props.onClick?.()
            return
        }
    }

    return (
        <>
            {'externalHref' in props && (
                <ButtonWithLink
                    type={props.type}
                    onClick={handleClick}
                    href={props.externalHref}
                    target="_blank"
                    isDisabled={props.isDisabled}
                >
                    {props.children}
                </ButtonWithLink>
            )}
            {!('externalHref' in props) && (
                <ButtonWithOnClick
                    type={props.type}
                    onClick={handleClick}
                    isDisabled={props.isDisabled}
                >
                    {props.children}
                </ButtonWithOnClick>
            )}
        </>
    )
}
