import * as adminModule from 'firebase-admin'
import * as functionsModule from 'firebase-functions'
import { CallableContext } from 'firebase-functions/lib/providers/https'
import { helpTesting } from '../utils';

export function authFunctions(admin: typeof adminModule, functions: typeof functionsModule) {
    const getLoginToken = functions.https.onCall(async (data: any, _context: CallableContext) => {
        const context = helpTesting(_context)
        const uid = context.auth && context.auth.uid
        if (uid) {
            return admin.auth().createCustomToken(uid)
        } else {
            return null
        }
    })

    return { getLoginToken }
}

