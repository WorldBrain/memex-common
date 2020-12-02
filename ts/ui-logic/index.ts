import { UILogic, UIEvent } from 'ui-logic-core'

interface MixinEntryBase {
    state: {}
    event: UIEvent<{}>
}

export type UILogicStructure<Structure extends {
    ownState: {},
    ownEvent: UIEvent<{}>,
    mixins: { [K in keyof Structure['mixins']]: MixinEntryBase }
}> = {
    ownState: Structure['ownState'],
    ownEvent: Structure['ownEvent'],
    state: Structure['ownState'] & (Structure extends { mixins: {} } ? Structure['mixins'][keyof Structure['mixins']]['state'] : {})
    event: Structure['ownEvent'] & (Structure extends { mixins: {} } ? Structure['mixins'][keyof Structure['mixins']]['event'] : {})
    mixins?: Structure['mixins']
}

type MixinObjects<Mixins extends { [K in keyof Mixins]: MixinEntryBase }> = {
    [K in keyof Mixins]: MemexUILogic<UILogicStructure<{ ownState: Mixins[K]['state'], ownEvent: Mixins[K]['event'], mixins: {} }>>
}

export abstract class MemexUILogic<Structure extends UILogicStructure<{
    ownState: {},
    ownEvent: UIEvent<{}>,
    mixins: {}
}>> extends UILogic<Structure['state'], Structure['event']> {
    mixins?: Structure['mixins']

    useMixins(
        mixins: MixinObjects<Structure['mixins']>
    ) {

    }

    getInitialMixinState(): Structure['mixins'][keyof Structure['mixins']]['state'] {
        return Object.assign({}, ...Object.values(this.mixins!).map(mixin => (mixin as MemexUILogic<{ state: {}, event: UIEvent<{}> }>).getInitialState()))
    }
}
