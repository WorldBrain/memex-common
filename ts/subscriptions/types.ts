export interface SubscriptionsService {
    getCurrentUserClaims(forceRefresh?: boolean): Promise<Claims | null>
    getCheckoutLink(options: SubscriptionCheckoutOptions): Promise<{ url: string }>
    getManageLink(options?: SubscriptionManageOptions): Promise<{ access_url: string }>
}

// Taken from: https://apidocs.chargebee.com/docs/api/subscriptions#subscription_status
export type SubscriptionStatus = 'in_trial' | 'future' | 'active' | 'non_renewing' | 'paused' | 'cancelled' | null

export interface Claims {
    subscriptionStatus?: SubscriptionStatus,
    subscriptionExpiry?: number| null, // Epoch in seconds
    subscriptions: SubscriptionMap
    features: FeatureMap
    lastSubscribed: number | null
}
export type SubscriptionMap = {
    [key in UserPlan]?: {
        expiry: number, // Epoch in seconds
        status?: SubscriptionStatus,
        donation?:number,
        id?: string,
    }
}
export type FeatureMap = {
    [key in UserFeature]?: {
        expiry: number, // Epoch in seconds
    }
}
export type UserFeature = 'backup' | 'sync' | 'beta'
export type UserPlan =
    | 'pro-monthly'
    | 'pro-yearly'


export interface SubscriptionCheckoutOptions {
    planId: UserPlan
    pioneerDonationAmount?: number
}

export interface SubscriptionManageOptions {
   forwardUrl ?: string
}
