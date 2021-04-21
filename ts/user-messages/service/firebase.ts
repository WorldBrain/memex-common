import firebaseModule from 'firebase'
import { UserMessageService, UserMessageEvents } from "./types";
import { EventEmitter } from "events";
import TypedEventEmitter from "typed-emitter";
import { UserMessage } from "../types";
import createResolvable, { Resolvable } from '@josephg/resolvable';

interface LastSeen {
    get(): Promise<number | null>
    set(value: number): Promise<void>
}

export class FirebaseUserMessageService implements UserMessageService {
    events = new EventEmitter() as TypedEventEmitter<UserMessageEvents>
    _lastSeen: number | null = null
    _destroyListener?: () => void
    _handlingIncomingMessage?: Resolvable<void>

    constructor(private dependencies: {
        firebase: typeof firebaseModule | (() => typeof firebaseModule)
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
            this._handleIncomingMessage(lastSeen, { message, timestamp })
        }

        const queueRef = await this._getQueueRef()
        if (!queueRef) {
            return
        }
        const ordered = queueRef.orderByChild('timestamp')
        const filtered = this._lastSeen ? ordered.startAt(this._lastSeen) : ordered
        filtered.on('child_added', listener)
        this._destroyListener = () => {
            filtered.off('child_added', listener)
        }
    }

    async _handleIncomingMessage(lastSeen: LastSeen, event: { timestamp: number, message: UserMessage }) {
        await this._handlingIncomingMessage
        const resolvable = this._handlingIncomingMessage = createResolvable()
        this.events.emit('message', event)
        this._lastSeen = event.timestamp
        await lastSeen.set(event.timestamp)
        delete this._handlingIncomingMessage
        resolvable.resolve()
    }

    async _getQueueRef() {
        const userId = await this.dependencies.auth.getCurrentUserId()
        if (!userId) {
            return null
        }
        return this._getFirebase().database().ref(`/userMessages/${userId}`)
    }

    _getFirebase() {
        let { firebase } = this.dependencies
        if (typeof firebase === 'function') {
            firebase = firebase()
        }
        return firebase
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
