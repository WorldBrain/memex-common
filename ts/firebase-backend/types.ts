import StorageManager from '@worldbrain/storex'
import ContentConversationStorage from '../content-conversations/storage'
import ContentSharingStorage from '../content-sharing/storage'
import UserStorage from '../user-management/storage'
import { ActivityStreamsService } from '../activity-streams/types'
import { ContentSharingBackend } from '../content-sharing/backend'
import { UserMessageService } from '../user-messages/service/types'

export interface FunctionsBackendStorage {
    manager: StorageManager
    modules: {
        users: UserStorage,
        contentSharing: ContentSharingStorage,
        contentConversations: ContentConversationStorage,
    }
}

export interface FunctionsBackendServices {
    activityStreams: ActivityStreamsService
    contentSharing: ContentSharingBackend
    userMessages: UserMessageService
}