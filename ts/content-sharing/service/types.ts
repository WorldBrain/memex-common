import { SharedListReference, SharedListRoleID } from '../types'
import { SharedListKey } from '../../web-interface/types/storex-generated/content-sharing'

interface SharedListKeyLink {
    link: string
    keyString?: string
    roleID: SharedListRoleID
}

export type ProcessSharedListKeyResult =
    | 'no-key-present'
    | 'not-authenticated'
    | 'success'
    | 'denied'

export interface ContentSharingServiceInterface {
    processCurrentKey: () => Promise<{ result: ProcessSharedListKeyResult }>
    deleteKeyLink: (params: {
        link: string
        listReference: SharedListReference
    }) => Promise<void>
    generateKeyLink: (params: {
        key: Pick<SharedListKey, 'roleID' | 'disabled'>
        listReference: SharedListReference
    }) => Promise<{ link: string }>
    getExistingKeyLinksForList: (params: {
        listReference: SharedListReference
    }) => Promise<{ links: SharedListKeyLink[] }>
}
