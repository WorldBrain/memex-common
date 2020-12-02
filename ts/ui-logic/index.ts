import { UILogic, UIEvent, UIEventHandlers } from 'ui-logic-core'

interface UILogicStructureBase<MixinKeys extends number | string | symbol> {
    state: {}
    event: UIEvent<{}>
    mixins: { [K in MixinKeys]: UIMixinStructureBase }
}

export type UILogicStructure<Structure extends UILogicStructureBase<keyof Structure['mixins']>> = {
    state: Structure['state']
    event: Structure['event']
    mixins: Structure['mixins']
}

export abstract class MemexUILogic<Structure extends UILogicStructure<UILogicStructureBase<keyof Structure['mixins']>>>
    extends UILogic<Structure['state'], Structure['event']>
{
    mixins?: { [K in keyof Structure['mixins']]: UIMixin<Structure['mixins'][K]> }

    useMixins(
        mixins: { [K in keyof Structure['mixins']]: UIMixin<Structure['mixins'][K]> },
        // options: {
        //     mapHandlers: { [K in keyof Structure['mixins'][keyof Structure['mixins']]['event']] }
        // }
    ) {
        for (const mixin of Object.values(mixins)) {
            Object.assign(this as any, (mixin as any).getHandlers())
        }
    }
}

interface UIMixinStructureBase {
    state: {}
    event: UIEvent<{}>
}

export type UIMixinStructure<Structure extends UIMixinStructureBase> = {
    state: Structure['state']
    event: Structure['event']
}
export abstract class UIMixin<Structure extends UIMixinStructure<UIMixinStructureBase>> {
    abstract getInitialState(): Structure['state']
    abstract getHandlers(): UIEventHandlers<Structure['state'], Structure['event']>
}
