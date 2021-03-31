import {
    UILogic,
    UIEventHandler,
    loadInitial,
    executeUITask,
} from '../../../main-ui/classes/logic'
import { SharedListRoleID } from '../../types'
import {
    ListShareModalDependencies,
    ListShareModalEvent,
    ListShareModalState,
    InviteLink,
} from './types'

type EventHandler<EventName extends keyof ListShareModalEvent> = UIEventHandler<
    ListShareModalState,
    ListShareModalEvent,
    EventName
>

export default class ListShareModalLogic extends UILogic<
    ListShareModalState,
    ListShareModalEvent
> {
    static COPY_MSG_TIMEOUT = 2000
    static SUCCESS_MSG_TIMEOUT = 2000

    private listId: string

    constructor(private dependencies: ListShareModalDependencies) {
        super()
    }

    getInitialState(): ListShareModalState {
        return {
            addLinkRoleID: SharedListRoleID.ReadWrite,
            deleteLinkState: 'pristine',
            addLinkState: 'pristine',
            loadState: 'pristine',
            showSuccessMsg: false,
            linkDeleteIndex: null,
            inviteLinks: [],
        }
    }

    init: EventHandler<'init'> = async ({ previousState }) => {
        const { contentSharing } = this.dependencies.services

        await loadInitial<ListShareModalState>(this, async () => {
            if (
                'listId' in this.dependencies &&
                this.dependencies.listId != null
            ) {
                this.listId = this.dependencies.listId

                const {
                    links,
                } = await contentSharing.getExistingKeyLinksForList({
                    listReference: {
                        type: 'shared-list-reference',
                        id: this.listId,
                    },
                })

                this.emitMutation({ inviteLinks: { $set: links } })
            }
        })
    }

    setAddLinkRoleID: EventHandler<'setAddLinkRoleID'> = ({ event }) => {
        this.emitMutation({ addLinkRoleID: { $set: Number(event.roleID) } })
    }

    addLink: EventHandler<'addLink'> = async ({ previousState }) => {
        const { clipboard, contentSharing } = this.dependencies.services
        const roleID = previousState.addLinkRoleID

        await executeUITask<ListShareModalState>(
            this,
            'addLinkState',
            async () => {
                if (roleID === SharedListRoleID.Reader
                    && previousState.inviteLinks.map(link => link.roleID).includes(SharedListRoleID.Reader)) {
                    throw new Error('Cannot create multiple reader links')
                }

                if (!this.listId && 'shareList' in this.dependencies) {
                    const { listId } = await this.dependencies.shareList()
                    this.listId = listId
                }

                const { link } = await contentSharing.generateKeyLink({
                    key: { roleID },
                    listReference: {
                        id: this.listId,
                        type: 'shared-list-reference',
                    },
                })

                this.emitMutation({
                    inviteLinks: { $push: [{ link, roleID }] },
                    showSuccessMsg: { $set: true },
                })

                await clipboard.copy(link)
            },
        )

        setTimeout(
            () => this.emitMutation({ showSuccessMsg: { $set: false } }),
            ListShareModalLogic.SUCCESS_MSG_TIMEOUT
        )
    }

    requestLinkDelete: EventHandler<'requestLinkDelete'> = ({ event, previousState }) => {
        if (previousState.inviteLinks[event.linkIndex].roleID === SharedListRoleID.Reader) {
            return
        }

        this.emitMutation({
            linkDeleteIndex: { $set: event.linkIndex },
        })
    }

    cancelLinkDelete: EventHandler<'cancelLinkDelete'> = () => {
        this.emitMutation({ linkDeleteIndex: { $set: null } })
    }

    confirmLinkDelete: EventHandler<'confirmLinkDelete'> = async ({
        previousState: { linkDeleteIndex, inviteLinks },
    }) => {
        const { contentSharing } = this.dependencies.services
        if (linkDeleteIndex == null) {
            throw new Error(
                'Index of link to delete is not set - cannot confirm deletion',
            )
        }
        await executeUITask<ListShareModalState>(
            this,
            'deleteLinkState',
            async () => {
                await contentSharing.deleteKeyLink({
                    link: inviteLinks[linkDeleteIndex].link,
                    listReference: {
                        id: this.listId,
                        type: 'shared-list-reference',
                    },
                })

                this.emitMutation({
                    linkDeleteIndex: { $set: null },
                    inviteLinks: {
                        $apply: (links: InviteLink[]) => [
                            ...links.slice(0, linkDeleteIndex),
                            ...links.slice(linkDeleteIndex + 1),
                        ],
                    },
                })
            },
        )
    }

    copyLink: EventHandler<'copyLink'> = async ({ event, previousState }) => {
        const { clipboard } = this.dependencies.services
        const inviteLink = previousState.inviteLinks[event.linkIndex]

        if (inviteLink == null) {
            throw new Error('Link to copy does not exist - cannot copy')
        }

        await clipboard.copy(inviteLink.link)
        this.emitMutation({
            inviteLinks: { [event.linkIndex]: { showCopyMsg: { $set: true } } }
        })

        setTimeout(() =>
            this.emitMutation({
                inviteLinks: { [event.linkIndex]: { showCopyMsg: { $set: false } } }
            }),
            ListShareModalLogic.COPY_MSG_TIMEOUT
        )
    }
}
