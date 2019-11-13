import {
    SubscriptionsService,
    Claims,
    SubscriptionCheckoutOptions,
} from './types'

export default class WorldbrainSubscriptionsService
    implements SubscriptionsService {

    constructor(private firebase: any) { }

    async getCurrentUserClaims(forceRefresh = false): Promise<Claims | null> {
        const currentUser = this.firebase.auth().currentUser
        if (currentUser == null) {
            return null
        }
        const idTokenResult = await currentUser.getIdTokenResult(forceRefresh)

        const claims: Claims = idTokenResult.claims as Claims

        return claims
    }

    async getCheckoutLink(
        options: SubscriptionCheckoutOptions,
    ): Promise<string> {
        const result = await this._callFirebaseFunction('getCheckoutLink')(
            options,
        )

        return result.data['hosted_page']
    }

    async getManageLink(
        options?: SubscriptionCheckoutOptions,
    ): Promise<string> {
        const result = this._callFirebaseFunction('getManageLink')(options)

        return result.data['portal_session']
    }

    _callFirebaseFunction(name: string, ...args: any[]) {
        return this.firebase.functions().httpsCallable(name)(...args)
    }
}
