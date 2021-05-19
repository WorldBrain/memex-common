import React from 'react'
import styled from 'styled-components'
import { Margin } from 'styled-components-spacing'
import { User } from '../../web-interface/types/users'
import { SharedPageInfo } from '../../content-sharing/types'
import ItemBox from '../components/item-box'
import CreationInfo, { CreationInfoProps } from './creation-info'

const PageContentBox = styled.div`
    display: flex;
    flex-direction: column;
    padding: 15px 15px 10px 15px;
`

const PageContentBoxBottom = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid #e0e0e0;
    height: 40px;
    padding: 0px 15px 0px 15px;
`

const PageInfoBoxLink = styled.a`
    text-decoration: none;
`

const PageInfoBoxRight = styled.div`
    text-decoration: none;
    cursor: default;
`

const PageInfoBoxActions = styled.div`
    display: flex;
`
const PageInfoBoxAction = styled.div<{ image: string }>`
    display: block;
    width: 20px;
    height: 20px;
    cursor: pointer;
    background-image: url('${(props) => props.image}');
    background-size: contain;
    background-position: center center;
    background-repeat: no-repeat;
`

const StyledPageResult = styled.div`
    display: flex;
    flex-direction: column;
`

const ResultContent = styled(Margin)`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
`
const PageUrl = styled.span`
    font-size: 12px;
    color: #545454;
`

const PageTitle = styled(Margin)`
    font-size: 14px;
    font-weight: 600;
    color: #3a2f45;
    justify-content: flex-start;
`

const CreatorBox = styled.div``

export type PageInfoBoxAction =
    | {
          image: string
          onClick?: () => void
      }
    | { node: React.ReactNode }

export interface PageInfoBoxProps {
    pageInfo: Pick<
        SharedPageInfo,
        'fullTitle' | 'createdWhen' | 'originalUrl' | 'normalizedUrl'
    >
    creator?: Pick<User, 'displayName'> | null
    actions?: Array<PageInfoBoxAction>
    children?: React.ReactNode
    renderCreationInfo?: (props: CreationInfoProps) => React.ReactNode
}

export default function PageInfoBox(props: PageInfoBoxProps) {
    const { pageInfo } = props
    const [domain] = pageInfo.normalizedUrl.split('/')
    const renderCreationInfo =
        props.renderCreationInfo ?? ((props) => <CreationInfo {...props} />)
    const hasTitle = pageInfo.fullTitle && pageInfo.fullTitle.length > 0

    return (
        <ItemBox>
            <StyledPageResult>
                <PageInfoBoxLink href={pageInfo.originalUrl} target="_blank">
                    <PageContentBox>
                        <ResultContent>
                            <PageUrl title={pageInfo.normalizedUrl}>
                                {domain}
                            </PageUrl>
                        </ResultContent>
                        <PageTitle>
                            {hasTitle ? pageInfo.fullTitle : pageInfo.normalizedUrl}
                        </PageTitle>
                    </PageContentBox>
                </PageInfoBoxLink>
                <PageContentBoxBottom>
                    <CreatorBox>
                    {props.creator &&
                        renderCreationInfo({
                            creator: props.creator,
                            createdWhen: pageInfo.createdWhen,
                        })}
                    </CreatorBox>
                    {props.actions && (
                        <PageInfoBoxRight>
                            <PageInfoBoxActions>
                                {props.actions.map((action, actionIndex) =>
                                    'image' in action ? (
                                        <PageInfoBoxAction
                                            key={actionIndex}
                                            image={action.image}
                                            onClick={action.onClick}
                                        />
                                    ) : (
                                        action.node
                                    ),
                                )}
                            </PageInfoBoxActions>
                        </PageInfoBoxRight>
                    )}
                </PageContentBoxBottom>
            </StyledPageResult>
        </ItemBox>
    )
}
