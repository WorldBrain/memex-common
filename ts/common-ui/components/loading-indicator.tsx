import React, { PureComponent } from 'react'
import styled, { keyframes } from 'styled-components'

class LoadingIndicator extends PureComponent {
    render() {
        return <Loader />
    }
}

const load = keyframes`
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
`

const Loader = styled.div`
    display: block;
    position: relative;
    font-size: 10px;
    text-indent: -9999em;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #99879f;
    background: gradient(left, #99879f 10%, rgba(60, 46, 71, 0) 42%);
    background: linear-gradient(to right, #99879f 10%, rgba(60, 46, 71, 0) 42%);
    animation: ${load} 1.4s infinite linear;
    transform: translateZ(0);

    &:before {
        border-radius: 100% 0 0 0;
        position: absolute;
        top: 0;
        left: 0;
        content: '';
    }

    &:after {
        background: #fff;
        width: 65%;
        height: 65%;
        border-radius: 50%;
        content: '';
        margin: auto;
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
    }
`

export default LoadingIndicator
