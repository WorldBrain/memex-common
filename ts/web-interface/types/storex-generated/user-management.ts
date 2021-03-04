export type User =
    {
        displayName?: string
    }

export type UserEmail =
    {
        address: string
        isPrimary: boolean
        isActive: boolean
    }

export type UserPublicProfile =
    {
        websiteURL?: string
        mediumURL?: string
        twitterURL?: string
        substackURL?: string
        bio?: string
        avatarURL?: string
        paymentPointer?: string
    }
