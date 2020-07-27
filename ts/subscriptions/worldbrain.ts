import {
    SubscriptionsService,
    Claims,
    SubscriptionCheckoutOptions, SubscriptionManageOptions,
} from './types'

export class WorldbrainSubscriptionsService
    implements SubscriptionsService {

    constructor(private firebase: any, private redirectUrl: string) { }

    getCurrentUserClaims = async (forceRefresh = false): Promise<Claims | null> => {
        const currentUser = this.firebase.auth().currentUser
        if (currentUser == null) {
            return null
        }
        const idTokenResult = await currentUser.getIdTokenResult(forceRefresh)

        const claims: Claims = idTokenResult.claims as Claims

        return claims
    }

    getCheckoutLink = async (
        options: SubscriptionCheckoutOptions ,
    ): Promise<{ url: string }> => {
        options["redirect_url"] = this.redirectUrl
        const result = await this._callFirebaseFunction('getCheckoutLink', options)
        return result.data['hosted_page']
    }

    getManageLink = async (
        options : SubscriptionManageOptions = {},
    ): Promise<{ "access_url":string }> => {
        options["redirect_url"] = this.redirectUrl
        options["forward_url"] = options.forwardUrl
        const result = await this._callFirebaseFunction('getManageLink',options)
        return result.data['portal_session']
    }

    _callFirebaseFunction(name: string, ...args: any[]) {
        return this.firebase.functions().httpsCallable(name)(...args)
    }
}
