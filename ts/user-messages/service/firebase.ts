import * as firebaseModule from 'firebase'
import { UserMessageService, UserMessageEvents } from "./types";
import { EventEmitter } from "events";
import TypedEventEmitter from "typed-emitter";
import { UserMessage } from "../types";
import { UserReference } from 'src/web-interface/types/users';

interface LastSeen {
    get(): Promise<number | null>
    set(value: number): Promise<void>
}

export class FirebaseUserMessageService implements UserMessageService {
    events = new EventEmitter() as TypedEventEmitter<UserMessageEvents>
    _lastSeen: number | null = null
    _destroyListener?: () => void

    constructor(private dependencies: {
        firebase: typeof firebaseModule
        auth: { getCurrentUserId(): Promise<number | string | null> },
    }) {

    }

    async startListening(dependencies: {
        auth: { events: TypedEventEmitter<{ changed(): void }> },
        lastSeen: LastSeen
    }) {
        this._lastSeen = await dependencies.lastSeen.get()
        this._setupListener(dependencies.lastSeen)
        dependencies.auth.events.on('changed', () => this._setupListener(dependencies.lastSeen))
    }

    async pushMessage(message: UserMessage): Promise<void> {
        const queueRef = await this._getQueueRef()
        if (!queueRef) {
            throw new Error(`Tried to push message to user messages queue without being authenticated`)
        }
        await queueRef.push({
            timestamp: firebaseModule.database.ServerValue.TIMESTAMP,
            message: message
        })
        // await this.dependencies.setLastSeen(Date.now())
    }

    async _setupListener(lastSeen: LastSeen) {
        this._destroyListener?.()

        const listener = (snapshot: firebaseModule.database.DataSnapshot) => {
            const { message, timestamp } = snapshot.val()
            this.events.emit('message', { timestamp, message })
            this._lastSeen = timestamp
            lastSeen.set(timestamp)
        }

        const queueRef = await this._getQueueRef()
        if (queueRef) {
            queueRef.orderByChild('timestamp').startAt(this._lastSeen ?? Date.now()).on('child_added', listener)
            this._destroyListener = () => {
                queueRef.off('child_added', listener)
            }
        }
    }

    async _getQueueRef() {
        const userId = await this.dependencies.auth.getCurrentUserId()
        return userId && this.dependencies.firebase.database().ref(`/userMessages/${userId}`)
    }
}

export function getUserMessageRules() {
    return {
        "userMessages": {
            "$user_id": {
                ".read": "auth != null && $user_id == auth.uid",
                ".write": "auth != null && $user_id == auth.uid",
                "$message_id": {
                    ".indexOn": ["timestamp"],
                    "timestamp": {
                        ".validate": "newData.val() == now"
                    },
                    "message": {
                        ".validate": true
                    },
                    "$other": {
                        ".validate": false
                    }
                }
            }
        }
    }
}
