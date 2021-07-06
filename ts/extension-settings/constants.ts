import type { ExtensionSettings } from './types'

export const EXTENSION_SETTINGS_NAME: {
    [Key in keyof ExtensionSettings]: string
} = {
    ReadwiseAPIKey: 'ReadwiseAPIKey',
}
