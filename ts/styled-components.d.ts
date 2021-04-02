import type { MemexTheme } from './common-ui/styles/types'

declare module 'styled-components' {
    export interface DefaultTheme extends MemexTheme {}
}
