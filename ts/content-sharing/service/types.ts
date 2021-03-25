import { SharedListReference, SharedListRoleID } from 'src/content-sharing/types'
import { SharedListKey } from 'src/web-interface/types/storex-generated/content-sharing'

interface SharedListKeyLink {
    link: string
    keyString: string
    roleID: SharedListRoleID
}

export type ProcessSharedListKeyResult =
    | 'no-key-present'
    | 'not-authenticated'
    | 'success'
    | 'denied'

export interface ContentSharingServiceInterface {
    processCurrentKey: () => Promise<{ result: ProcessSharedListKeyResult }>
    deleteKeyLink: (params: { link: string }) => Promise<void>
    generateKeyLink: (params: {
        key: Pick<SharedListKey, 'roleID' | 'disabled'>
        listReference: SharedListReference
    }) => Promise<{ link: string, keyString: string }>
    getExistingKeyLinksForList: (params: {
        listReference: SharedListReference
    }) => Promise<{ links: SharedListKeyLink[] }>
}
