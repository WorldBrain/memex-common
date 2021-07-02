import type { Anchor } from './types'

// TODO: Support other selector descriptor types
export const getAnchorSelector = (
    anchor: Anchor,
    descriptorType: 'TextPositionSelector',
): { start: number } =>
    anchor.descriptor.content.find(
        (content) => content.type === descriptorType,
    ) ?? {
        start: 0,
    }
