import TypedEventEmitter from "typed-emitter";
import { UserMessage } from "../types";

export interface UserMessageEvents {
    message(event: { timestamp: number, message: UserMessage }): void
}

export interface UserMessageService {
    events: TypedEventEmitter<UserMessageEvents>
    pushMessage(message: UserMessage): Promise<void>
}
