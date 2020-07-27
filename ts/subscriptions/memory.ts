import {
    SubscriptionsService,
    Claims,
    SubscriptionCheckoutOptions, SubscriptionManageOptions,
} from './types'

export class MemorySubscriptionsService
    implements SubscriptionsService {

    public claims: Claims | null = null

    constructor(options: { expiry?: number } = {}) {
        const { expiry } = options
        if (expiry) {
            this.claims = {
                subscriptions: {},
                features: {},
                lastSubscribed: null,
            }
            this.claims.subscriptions['pro-yearly'] = { expiry }
            this.claims.features['backup'] = { expiry }
            this.claims.features['sync'] = { expiry }
        }
    }

    async getCurrentUserClaims(forceRefresh = false): Promise<Claims | null> {
        return this.claims
    }

    async getCheckoutLink(
        options: SubscriptionCheckoutOptions,
    ): Promise<{url:string}> {
        return {url:`https://checkout.link?plan=${options.planId}`
    }
    }

    async getManageLink(
        options?: SubscriptionManageOptions,
    ): Promise<{ "access_url":string }> {
        return {"access_url":`https://manage.link` }
    }

}
