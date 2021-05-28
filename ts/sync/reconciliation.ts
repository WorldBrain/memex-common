import StorageManager, {
    OperationBatch,
    UpdateObjectsBatchOperation,
} from '@worldbrain/storex'
import extractTerms from '@worldbrain/memex-stemmer/lib/index'
import { SPECIAL_LIST_IDS } from '@worldbrain/memex-storage/lib/lists/constants'
import { getTermsField } from '../storage/utils'
import { mergeTermFields } from '../page-indexing/utils'

export function createMemexReconciliationProcessor(
    storageManager: StorageManager,
) {
    return async (reconciliation: OperationBatch) => {
        for (const step of reconciliation) {
            if (
                !['updateObjects', 'createObject'].includes(step.operation) ||
                !['customLists', 'pages', 'pageListEntries'].includes(
                    step.collection,
                )
            ) {
                continue
            }

            if (
                step.collection === 'pages' &&
                step.operation === 'updateObjects'
            ) {
                const existingPage = await storageManager
                    .collection('pages')
                    .findObject({ url: step.where.url })

                mergeTerms(step, existingPage)
            } else if (
                step.collection === 'customLists' &&
                step.operation === 'updateObjects'
            ) {
                const existingList = await storageManager
                    .collection('customLists')
                    .findObject({ id: step.where.id })

                mergeTerms(step, existingList)
            } else if (
                step.collection === 'pageListEntries' &&
                step.operation === 'createObject'
            ) {
                // If a new list entry is coming which points to a non-existent list, point it to the mobile list
                const foundList = await storageManager
                    .collection('customLists')
                    .findObject({ id: step.args.listId })

                if (foundList) {
                    continue
                }

                step.args.listId = SPECIAL_LIST_IDS.MOBILE
            }
        }

        return reconciliation
    }
}

function mergeTerms(step: UpdateObjectsBatchOperation, existingValue: any) {
    for (const [fieldName, fieldValue] of Object.entries(step.updates)) {
        if (!fieldValue) {
            continue
        }

        const termsField = getTermsField(step.collection, fieldName)
        if (termsField) {
            step.updates[termsField] = extractTerms(fieldValue as string)
            const merged = mergeTermFields(
                termsField,
                existingValue,
                step.updates,
            )
            step.updates[termsField] = merged
        }
    }
}
