import { SpacingValue } from 'styled-components-spacing'

export type ColorThemeKeys =
    | 'background'
    | 'warning'
    | 'primary'
    | 'secondary'
    | 'subText'
    | 'purple'
    | 'lightgrey'
    | 'grey'
    | 'darkgrey'
    | 'black'
    | 'lightblack'

export type IconKeys =
    | 'copy'
    | 'removeX'
    | 'hamburger'
    | 'addPeople'
    | 'checkRound'
    | 'alertRound'
    | 'check'
    | 'people'
    | 'webLogo'
    | 'mediumLogo'
    | 'twitterLogo'
    | 'substackLogo'
    | 'webMonetizationLogo'
    | 'webMonetizationLogoConfirmed'

export type FontThemeKeys = 'primary' | 'secondary'

export declare type FontSizeThemeKeys =
    | 'header'
    | 'listTitle'
    | 'url'
    | 'text'
    | 'smallText'

export declare type LineHeightThemeKeys = FontSizeThemeKeys

export interface MemexTheme {
    // NOTE(vincent): This is intentionally written in singular, not plural, becaused its used by the `styled-components-spacing` library.
    // Renaming it breaks spacing through that library.
    spacing: { [Key in SpacingValue]: string }
    colors: { [Key in ColorThemeKeys]: string } & {
        overlay: { [Key in 'background' | 'dialog']: string }
    }
    fonts: { [Key in FontThemeKeys]: string }
    fontWeights: { [Key in 'normal' | 'bold'] }
    fontSizes: { [Key in FontSizeThemeKeys]: string }
    lineHeights: {
        [Key in LineHeightThemeKeys]: string
    }
    hoverBackgrounds: { [Key in 'primary']: string }
    borderRadii: { [Key in 'default']: string }
    zIndices: { [Key in 'overlay']: number }
    icons: { [Key in IconKeys]: string }
}
