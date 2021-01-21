import moment from 'moment'
import React from 'react'
import styled from 'styled-components'
import { Margin } from 'styled-components-spacing'
import UserAvatar from './user-avatar'
import { User } from '../../web-interface/types/users'

const StyledCreationInfo = styled.div`
    display: flex;
`

const AvatarHolder = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
`

const Details = styled.div``
const Creator = styled.div`
    font-weight: 600;
    color: ${(props) => props.theme.colors.primary};
    font-size: 12px;
`
const EditedText = styled.span`
    font-weight: bold;
    margin-right: 5px;
`
const CreationDate = styled.div`
    font-family: 'Poppins';
    font-weight: normal;
    font-size: 12px;
    color: ${(props) => props.theme.colors.primary};
`

export interface CreationInfoProps {
    createdWhen?: number
    lastEdited?: number
    creator?: Pick<User, 'displayName'> | null
}

export default function CreationInfo(props: CreationInfoProps) {
    return (
        <StyledCreationInfo>
            {props.creator != null && (
                <AvatarHolder>
                    <Margin right="small">
                        <UserAvatar
                            user={props.creator}
                            loading={!props.creator}
                        />
                    </Margin>
                </AvatarHolder>
            )}
            <Details>
                {props.creator?.displayName && (
                    <Creator>
                        {props.creator?.displayName ?? <span>&nbsp;</span>}
                    </Creator>
                )}
                <CreationDate>
                    {props.lastEdited && <EditedText>Last Edit: </EditedText>}
                    {props.createdWhen || props.lastEdited ? (
                        moment(props.lastEdited ?? props.createdWhen).format(
                            'LLL',
                        )
                    ) : (
                        <span>&nbsp;</span>
                    )}
                </CreationDate>
            </Details>
        </StyledCreationInfo>
    )
}
