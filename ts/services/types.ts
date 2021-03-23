import type { DeviceServiceInterface } from './device/types'
import type { OverlayServiceInterface } from './overlay/types'
import type { ClipboardServiceInterface } from './clipboard/types'
import type { LogicRegistryServiceInterface } from './logic-registry/types'

export interface Services {
    overlay: OverlayServiceInterface
    clipboard: ClipboardServiceInterface
    logicRegistry: LogicRegistryServiceInterface
    device: DeviceServiceInterface
}
