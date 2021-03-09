import { UserMessageService, UserMessageEvents } from "./types";
import { EventEmitter } from "events";
import TypedEventEmitter from "typed-emitter";
import { UserMessage } from "../types";

export class MemoryUserMessageService implements UserMessageService {
    events = new EventEmitter() as TypedEventEmitter<UserMessageEvents>

    startListening() {

    }

    async pushMessage(message: UserMessage): Promise<void> {

    }
}
