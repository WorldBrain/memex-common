import type { DeviceServiceInterface } from './device/types'
import type { OverlayServiceInterface } from './overlay/types'
import type { ClipboardServiceInterface } from './clipboard/types'
import type { LogicRegistryServiceInterface } from './logic-registry/types'

type UIServices = 'logicRegistry' | 'device'
export type UIElementServices<Wanted extends keyof Services = never> = Pick<
    Services,
    UIServices | Wanted
>

export interface Services {
    overlay: OverlayServiceInterface
    clipboard: ClipboardServiceInterface
    logicRegistry: LogicRegistryServiceInterface
    device: DeviceServiceInterface
}
