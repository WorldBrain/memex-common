import StorageManager from '@worldbrain/storex'
import ContentConversationStorage from '../content-conversations/storage'
import ContentSharingStorage from '../content-sharing/storage'
import UserStorage from '../user-management/storage'
import { ActivityStreamsService } from '../activity-streams/types'
import { ContentSharingService } from '../content-sharing/service'
import { UserMessageService } from 'src/user-messages/service/types'

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
    contentSharing: ContentSharingService
    userMessages: UserMessageService
}