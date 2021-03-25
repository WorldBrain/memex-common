import type { DeviceServiceInterface } from './device/types'
import type { OverlayServiceInterface } from './overlay/types'
import type { ClipboardServiceInterface } from './clipboard/types'
import type { LogicRegistryServiceInterface } from './logic-registry/types'
import type { ContentSharingServiceInterface } from '../content-sharing/service/types'

type UIServices = 'logicRegistry' | 'device'
export type UIElementServices<Wanted extends keyof Services = never> = Pick<
    Services,
    UIServices | Wanted
>

export interface Services {
    device: DeviceServiceInterface
    overlay: OverlayServiceInterface
    clipboard: ClipboardServiceInterface
    logicRegistry: LogicRegistryServiceInterface

    // Feature specific services
    contentSharing: ContentSharingServiceInterface
}
