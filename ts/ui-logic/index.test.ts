import expect from "expect";
import { UIEvent, UIEventHandler } from "ui-logic-core";
import { TestLogicContainer } from "ui-logic-core/lib/testing";
import { MemexUILogic, UILogicStructure, UIMixin } from ".";

interface ConversationState {
    conversations: { [id: string]: { expanded: boolean } }
}

type ConversationEvent = UIEvent<{
    toggleConversation: { id: string }
}>

interface ConversationMixinStructure {
    state: ConversationState;
    event: ConversationEvent;
}

class ConversationMixin extends UIMixin<ConversationMixinStructure> {
    getInitialState() {
        return {
            conversations: {},
        }
    }

    getHandlers() {
        return {
            toggleConversation: incoming => {
                if (incoming.previousState.conversations[incoming.event.id]) {
                    return { conversations: { [incoming.event.id]: { $toggle: ['expanded'] } } }
                } else {
                    return { conversations: { [incoming.event.id]: { $set: true } } }
                }
            }
        }
    }
}


type PageState = { title: string }

type PageEvent = UIEvent<{}>

interface PageMixins {
    conversations: ConversationMixinStructure;
}

type PageLogicStructure = UILogicStructure<{
    state: PageState & ConversationState;
    event: PageEvent & ConversationEvent;
    mixins: PageMixins;
}>

class PageLogic extends MemexUILogic<PageLogicStructure> {
    constructor() {
        super()

        this.mixins = {
            conversations: new ConversationMixin()
        }
    }

    getInitialState() {
        return {
            title: '',
            ...this.mixins.conversations.getInitialState(),
        }
    }
}

describe('UILogic mixins', () => {
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
