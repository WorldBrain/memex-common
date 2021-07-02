export interface Descriptor {
    strategy: string
    content: any[]
}

export interface Anchor {
    quote: string
    descriptor: Descriptor
}

export type SelectorDescriptorType =
    | 'TextPositionSelector'
    | 'RangeSelector'
    | 'TextQuoteSelector'
