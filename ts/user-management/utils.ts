import { UserReference } from 'src/web-interface/types/users'

export const getUserReference = (userId: string | number): UserReference => {
    return { type: 'user-reference', id: userId }
}
