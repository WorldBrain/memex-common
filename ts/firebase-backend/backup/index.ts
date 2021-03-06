import * as functions from 'firebase-functions';
import * as firestore from '@google-cloud/firestore'
import { COLLECTIONS_TO_BACKUP } from './constants';

const bucket = 'gs://worldbrain-firestore-backup';

export const scheduledFirestoreExport = functions.pubsub
    .schedule('0 2 * * *') // every day at 2am
    .onRun(() => {

        const client = new firestore.v1.FirestoreAdminClient();
        const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
        const databaseName =
            client.databasePath(projectId, '(default)');

        return client.exportDocuments({
            name: databaseName,
            outputUriPrefix: bucket,
            // Leave collectionIds empty to export all collections
            // or set to a list of collection IDs to export,
            // collectionIds: ['users', 'posts']
            collectionIds: COLLECTIONS_TO_BACKUP
        })
            .then((responses: any) => {
                const response = responses[0];
                console.log(`Operation Name: ${response['name']}`);
            })
            .catch((err: Error) => {
                console.error(err);
                throw new Error('Export operation failed');
            });
    });
