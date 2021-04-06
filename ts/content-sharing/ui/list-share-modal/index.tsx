import React from 'react'
import styled from 'styled-components'
import { Margin } from 'styled-components-spacing'
import { UIElement } from '../../../main-ui/classes'
import { SharedListRoleID } from '../../types'
import Overlay from '../../../main-ui/containers/overlay'
import Icon from '../../../common-ui/components/icon'
import Button from '../../../common-ui/components/button'
import LoadingIndicator from '../../../common-ui/components/loading-indicator'
import Select from '../../../common-ui/components/select'
import Logic from './logic'
import {
    ListShareModalDependencies,
    ListShareModalEvent,
    ListShareModalState,
    InviteLink,
} from './types'
import { sharedListRoleIDToString } from './util'

export type Props = ListShareModalDependencies & {}

export default class ListShareModal extends UIElement<
    Props,
    ListShareModalState,
    ListShareModalEvent
> {
    constructor(props: Props) {
        super(props, { logic: new Logic(props) })
    }

    private get addBtnDisabled(): boolean {
        const { addLinkRoleID, addLinkState, inviteLinks } = this.state

        return (
            addLinkState === 'running' ||
            (inviteLinks.find(
                (link) => link.roleID === SharedListRoleID.Commenter,
            ) != null &&
                addLinkRoleID === SharedListRoleID.Commenter)
        )
    }

    private renderDeleteModal = () =>
        this.state.linkDeleteIndex != null && (
            <Overlay
                services={this.props.services}
                onCloseRequested={() =>
                    this.processEvent('cancelLinkDelete', null)
                }
            >
                <DeleteModalContainer>
                    <Header>Sure you want to delete this link?</Header>
                    <Text>This action cannnot be undone.</Text>
                    <Margin top="medium">
                        <DeleteModalBtnContainer>
                            <Margin right="small">
                                <Button
                                    type="primary-action"
                                    isDisabled={
                                        this.state.deleteLinkState === 'running'
                                    }
                                    onClick={() =>
                                        this.processEvent(
                                            'confirmLinkDelete',
                                            null,
                                        )
                                    }
                                >
                                    Delete
                                </Button>
                            </Margin>
                            <Button
                                type="alternative-small"
                                isDisabled={
                                    this.state.deleteLinkState === 'running'
                                }
                                onClick={() =>
                                    this.processEvent('cancelLinkDelete', null)
                                }
                            >
                                Cancel
                            </Button>
                        </DeleteModalBtnContainer>
                    </Margin>
                </DeleteModalContainer>
            </Overlay>
        )

    private renderCopyableLink = ({
        link,
        roleID,
        linkIndex,
        showCopyMsg,
    }: InviteLink & { linkIndex: number }) => (
        <Margin key={linkIndex} bottom="smallest">
            <LinkContainer>
                <CopyLinkBox>
                    <Icon
                        icon="copy"
                        height="16px"
                        onClick={() =>
                            this.processEvent('copyLink', { linkIndex })
                        }
                    />
                    <Margin horizontal="small">
                        <LinkBox
                            onClick={() =>
                                this.processEvent('copyLink', { linkIndex })
                            }
                        >
                            <Link>
                                {showCopyMsg ? 'Copied to clipboard' : link}
                            </Link>
                        </LinkBox>
                    </Margin>
                    <PermissionText>
                        <Margin right="smallest">invite as</Margin>
                        <BoldText>{sharedListRoleIDToString(roleID)}</BoldText>
                    </PermissionText>
                </CopyLinkBox>
                {/*{roleID !== SharedListRoleID.Reader && (
                    <Icon
                        icon="removeX"
                        height="12px"
                        onClick={() =>
                            this.processEvent('requestLinkDelete', {
                                linkIndex,
                            })
                        }
                    />
                )}*/}
            </LinkContainer>
        </Margin>
    )

    private renderInviteLinks = () => {
        if (this.state.loadState === 'running') {
            return <LoadingIndicator />
        }

        if (
            this.state.inviteLinks.length === 0 &&
            this.state.addLinkState !== 'running'
        ) {
            return
        }

        const renderedLinks = this.state.inviteLinks.map((link, linkIndex) =>
            this.renderCopyableLink({
                ...link,
                linkIndex,
            }),
        )

        return (
            <InviteLinksBox>
                <Margin top="medium">
                    <Margin bottom="small">
                        <Header>Invite Links</Header>
                    </Margin>
                    <InviteLinksContainer>{renderedLinks}</InviteLinksContainer>
                </Margin>
            </InviteLinksBox>
        )
    }

    private renderRoleIDSelect = () => (
        <Margin horizontal="small">
            <Select
                value={this.state.addLinkRoleID}
                onChange={(roleID) =>
                    this.processEvent('setAddLinkRoleID', { roleID })
                }
                options={[
                    {
                        value: SharedListRoleID.Commenter,
                        headerText: sharedListRoleIDToString(
                            SharedListRoleID.Commenter,
                        ),
                        subText: 'Can view content and reply to notes',
                    },
                    {
                        value: SharedListRoleID.ReadWrite,
                        headerText: sharedListRoleIDToString(
                            SharedListRoleID.ReadWrite,
                        ),
                        subText:
                            'Add pages, notes, replies and delete own entries',
                    },
                ]}
            />
        </Margin>
    )

    private renderAddLinkMsg = () => {
        if (!this.state.showSuccessMsg && this.state.addLinkState !== 'error') {
            return
        }

        const iconField = this.state.showSuccessMsg
            ? 'checkRound'
            : 'alertRound'
        const msgText =
            this.state.addLinkState !== 'error'
                ? 'Link created and copied to clipboard'
                : 'Error creating the link. Try again'

        return (
            <Margin left="medium">
                <MsgContainer>
                    <AddMsgBox>
                        <Margin right="small">
                            <Icon icon={iconField} height="20px" />
                        </Margin>
                        <MsgText>{msgText}</MsgText>
                    </AddMsgBox>
                </MsgContainer>
            </Margin>
        )
    }

    render() {

        console.log(this.state.addLinkRoleID)
        return (
            <>
                <Overlay
                    services={this.props.services}
                    onCloseRequested={this.props.onCloseRequested}
                >
                    <ModalContainer>
                        <Header>Invite by Link</Header>
                        <Text>
                            Invite other people to view or collaborate on this
                            collection
                        </Text>
                        <Margin top="medium">
                            <AddLinkBox>
                                <Margin bottom="small">
                                    <AddLinkBoxTextContainer>
                                        <Text>
                                            Create an invite link that grants{' '}
                                        </Text>
                                        {this.renderRoleIDSelect()}
                                        <Text>
                                            {' '}
                                            access to anyone who opens it.
                                        </Text>
                                    </AddLinkBoxTextContainer>
                                </Margin>
                                {this.state.addLinkRoleID === 800 ? (
                                    <PermissionDisclaimer bottom="medium">
                                        <strong>Permission:</strong> Can add pages, highlights, notes and replies
                                    </PermissionDisclaimer>
                                ):(
                                    <PermissionDisclaimer bottom="medium">
                                        <strong>Permission:</strong> Can view pages, highlights and add replies
                                    </PermissionDisclaimer>
                                )}
                                <ButtonBox>
                                    <Button
                                        type="primary-action"
                                        isDisabled={this.addBtnDisabled}
                                        onClick={() =>
                                            this.processEvent('addLink', null)
                                        }
                                    >
                                        {this.state.addLinkState ===
                                        'running' ? (
                                            <LoadingIndicator />
                                        ) : (
                                            'Add Link'
                                        )}
                                    </Button>
                                    {this.renderAddLinkMsg()}
                                </ButtonBox>
                            </AddLinkBox>
                        </Margin>
                        {this.renderInviteLinks()}
                    </ModalContainer>
                </Overlay>
                {this.renderDeleteModal()}
            </>
        )
    }
}

const ModalContainer = styled.div`
    width: 100%;
    padding: 20px;
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    flex-direction: column;

    & * {
        font-family: ${(props) => props.theme.fonts.primary};
    }
`

const DeleteModalContainer = styled(ModalContainer)`
    align-items: flex-start;
    justify-content: center;

    & span {
        text-align: center;
        width: 100%;
    }

    & > div {
        width: 100%;
    }
`

const DeleteModalBtnContainer = styled.div`
    display: flex;
    width: 100%;
    justify-content: center;
`

const Header = styled.div`
    font-size: 18px;
    font-weight: bold;
    color: ${(props) => props.theme.colors.primary};
`

const Text = styled.span`
    font-size: 14px;
    color: ${(props) => props.theme.colors.primary};
    opacity: 0.8;
`

const PermissionText = styled.span`
    font-size: 14px;
    color: ${(props) => props.theme.colors.primary};
    opacity: 0.8;
    display: flex;
    flex-direction: row;
`

const MsgText = styled.span`
    font-size: 12px;
    color: ${(props) => props.theme.colors.primary};
    font-weight: bold;
    display: flex;
    flex-direction: row;
`

const BoldText = styled.span`
    font-weight: bold;
`

const AddLinkBox = styled.div`
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    background: ${(props) => props.theme.colors.lightgrey};
    border-radius: 5px;
    padding 20px 20px;
    flex-direction: column;
`

const AddLinkBoxTextContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
`

const LinkContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
`

const PrimaryButton = styled.div`
    display: flex;
    justify-content: center;
    padding: 5px 10px;
    font-size: 14px;
    background-color: ${(props) => props.theme.colors.secondary};
    border-radius: 3px;
    cursor: pointer;
    font-weight: 600;
    color: ${(props) => props.theme.colors.primary};
    text-decoration: none;
`

const InviteLinksContainer = styled.div``

const AddMsgBox = styled.div`
    display: flex;
    width: 100%;
    justify-content: center;
    align-items: center;
    height: 34px;
    border-radius: 3px;
`

const InviteLinksBox = styled.div`
    width: 100%;
`

const LinkBox = styled.div`
    display: flex;
    background-color: ${(props) => props.theme.colors.grey};
    font-size: 12px;
    border-radius: 3px;
    width: 350px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow-x: scroll;
    text-align: left;
    cursor: pointer;
`

const Link = styled.span`
    padding: 5px 10px;
`

const CopyLinkBox = styled.div`
    display: flex;
    justify-content: flex-start;
    align-items: center;
`

const MsgContainer = styled.div`
    > div {
        width: 100%;
    }
`

const ButtonBox = styled.div`
    display: flex;
    justify-content: flex-start;
    align-items: center;
`

const PermissionDisclaimer = styled(Margin)`
    font-size: 12px;
    color: ${(props) => props.theme.colors.primary};
    opacity: 0.8;
`
