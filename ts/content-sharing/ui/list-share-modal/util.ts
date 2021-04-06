import { SharedListRoleID } from '../../types'

export const sharedListRoleIDToString = (roleID: SharedListRoleID): string => {
    if (roleID === SharedListRoleID.Commenter) {
        return 'Commenter'
    }
    if (roleID === SharedListRoleID.ReadWrite) {
        return 'Contributor'
    }
    if (roleID === SharedListRoleID.Owner) {
        return 'Owner'
    }
    if (roleID === SharedListRoleID.Admin) {
        return 'Admin'
    }
    return ''
}
