import type TypedEventEmitter from 'typed-emitter'
import type React from 'react'

export interface OverlayServiceEvents {
    closeRequest: (event: { id: number }) => void
    contentUpdated: (event: { id: number; content: React.ReactNode }) => void
}

export interface OverlayServiceInterface {
    events: TypedEventEmitter<OverlayServiceEvents>
}
