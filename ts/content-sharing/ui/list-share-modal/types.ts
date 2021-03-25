import { UIEvent } from '../../../main-ui/classes/logic'
import { UITaskState } from '../../../main-ui/types'
import { UIElementServices } from '../../../services/types'
import { SharedListRoleID } from '../../types'

export interface InviteLink {
    roleID: SharedListRoleID
    link: string
}

export interface ListShareModalDependencies {
    services: UIElementServices<'contentSharing' | 'overlay' | 'clipboard'>
    listID: string | number
    onCloseRequested: () => void
}

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
