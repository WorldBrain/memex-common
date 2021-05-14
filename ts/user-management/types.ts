import { AutoPkStorageReference } from '../storage/references'
export { UserPublicProfile } from '../web-interface/types/storex-generated/user-management'
import { User } from '../web-interface/types/users'
import { UserPublicProfile } from '../web-interface/types/storex-generated/user-management'

export type UserPublicProfileReference = AutoPkStorageReference<
    'user-public-profile-reference'
>

export type UserPublicDetails = { user: User; profile: UserPublicProfile }

export type GetUsersPublicDetailsResult = {
    [userId: string]: UserPublicDetails
}
