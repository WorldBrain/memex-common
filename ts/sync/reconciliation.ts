import StorageManager, {
    OperationBatch,
    UpdateObjectsBatchOperation,
} from '@worldbrain/storex'
import extractTerms from '@worldbrain/memex-stemmer/lib/index'
import { getTermsField } from '../storage/utils'
import { mergeTermFields } from '../page-indexing/utils'

export function createMemexReconciliationProcessor(
    storageManager: StorageManager,
) {
    return async (reconciliation: OperationBatch) => {
        for (const step of reconciliation) {
            if (
                step.operation !== 'updateObjects' ||
                !(
                    step.collection === 'customLists' ||
                    step.collection === 'pages'
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
