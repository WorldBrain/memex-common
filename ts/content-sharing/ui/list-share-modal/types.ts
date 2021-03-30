import { UIEvent } from '../../../main-ui/classes/logic'
import { UITaskState } from '../../../main-ui/types'
import { UIElementServices } from '../../../services/types'
import { SharedListRoleID } from '../../types'

export interface InviteLink {
    roleID: SharedListRoleID
    link: string
}

export type ListShareModalDependencies = {
    services: UIElementServices<'contentSharing' | 'overlay' | 'clipboard'>
    onCloseRequested: () => void
} & (
    | {
          /** If not defined, will attempt to share the list on first link generation. */
          listId: string
      }
    | {
          /** Define this if remote list ID is not immediately available i.e., not-yet-shared. */
          shareList: () => Promise<{ listId: string }>
      }
)

export interface ListShareModalState {
    addLinkRoleID: SharedListRoleID
    inviteLinks: InviteLink[]
    linkDeleteIndex: number | null
    showSuccessMsg: boolean

    deleteLinkState: UITaskState
    addLinkState: UITaskState
    loadState: UITaskState
}

export type ListShareModalEvent = UIEvent<{
    setAddLinkRoleID: { roleID: SharedListRoleID }
    addLink: null

    requestLinkDelete: { linkIndex: number }
    confirmLinkDelete: null
    cancelLinkDelete: null

    copyLink: { linkIndex: number }
}>
