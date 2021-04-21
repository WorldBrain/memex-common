import * as adminModule from 'firebase-admin'
import * as functionsModule from 'firebase-functions';

import { activityStreamFunctions } from '../activity-streams/services/firebase-functions/server'
import { contentSharingFunctions } from '../content-sharing/backend/firebase-functions'

import { runningInEmulator, emulatedConfig } from './constants';
import { createFirestoreTriggers } from './setup';

import { getLoginToken } from './auth'
import { getCheckoutLink, getManageLink, userSubscriptionChanged, refreshUserClaims } from './subscriptions'
import { generateTwilioNTSToken } from './twilio'
import { sendWelcomeEmailOnSignUp } from "./user";
import { scheduledFirestoreExport } from "./backup";
import { uninstall, uninstallLog } from "./analytics"
import { registerBetaUserCall as registerBetaUser } from "./beta"
import { createServerApplicationLayerAsFunction } from './app-layer/server';

export function main(admin: typeof adminModule, functions: typeof functionsModule) {
    admin.initializeApp((runningInEmulator) ? emulatedConfig : undefined)

    return {
        applicationLayer: createServerApplicationLayerAsFunction({
            firebase: admin as any,
            functions,
        }),
        getLoginToken,
        getCheckoutLink,
        getManageLink,
        userSubscriptionChanged,
        refreshUserClaims,
        generateTwilioNTSToken,
        sendWelcomeEmailOnSignUp,
        scheduledFirestoreExport,
        uninstall,
        uninstallLog,
        registerBetaUser,
        activityStreams: activityStreamFunctions({
            firebase: admin as any,
            functions,
        }),
        contentSharing: contentSharingFunctions({
            firebase: admin as any,
            functions,
        }),
        triggers: createFirestoreTriggers({
            firebase: admin as any,
            functions,
        })
    }
}
