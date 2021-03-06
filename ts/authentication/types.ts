import TypedEventEmitter from 'typed-emitter'

export interface AuthenticatedUser {
    id: string
    displayName: string | null
    email: string | null
    emailVerified: boolean
}

export interface AuthService {
    events: TypedEventEmitter<AuthServiceEvents>

    generateLoginToken(): Promise<{ token: string }>
    loginWithToken(token: string): Promise<void>
    refreshUserInfo(): Promise<void>
    getCurrentUser(): Promise<AuthenticatedUser | null>
    getCurrentToken(): Promise<{ token: string | null }>
    signOut(): void
}

export interface AuthServiceEvents {
    changed: (event: { user: AuthenticatedUser | null }) => void
}
