import expect from "expect";
import { UIEvent, UIEventHandler } from "ui-logic-core";
import { TestLogicContainer } from "ui-logic-core/lib/testing";
import { MemexUILogic, UILogicStructure } from ".";

interface ConversationState {
    conversations: { [id: string]: { expanded: boolean } }
}

type ConversationEvent = UIEvent<{
    toggleConversation: { id: string }
}>

type ConversationLogicStructure = UILogicStructure<{
    ownState: ConversationState;
    ownEvent: ConversationEvent;
}>

class ConversationLogic extends MemexUILogic<ConversationLogicStructure> {
    getInitialState() {
        return {
            conversations: {},
        }
    }

    toggleConversation: UIEventHandler<ConversationState, ConversationEvent, 'toggleConversation'> = incoming => {
        if (incoming.previousState.conversations[incoming.event.id]) {
            return { conversations: { [incoming.event.id]: { $toggle: ['expanded'] } } }
        }
    }
}

type PageState = { title: string }

type PageEvent = UIEvent<{}>

interface PageMixins {
    conversations: { state: ConversationState, event: ConversationEvent }
}

type PageLogicStructure = UILogicStructure<{
    ownState: PageState;
    ownEvent: PageEvent;
    mixins: PageMixins;
}>

class PageLogic extends MemexUILogic<PageLogicStructure> {
    constructor() {
        super()

        this.mixins

        this.useMixins({
            conversations: new ConversationLogic()
        })
    }

    getInitialState() {
        return {
            ...this.getInitialMixinState(),
            title: ''
        }
    }
}

describe('Top-level UILogic mixins', () => {
    it('should work', async () => {
        const logic = new PageLogic()
        const component = new TestLogicContainer<PageLogicStructure['state'], PageLogicStructure['event']>(logic)
        expect(component.state).toEqual({
            title: '',
            conversations: {},
        })
        await component.processEvent('toggleConversation', {
            id: 'first'
        })
        expect(component.state).toEqual({
            title: '',
            conversations: {
                first: { expanded: true }
            },
        })
    })
})
