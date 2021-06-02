import chunk from 'lodash/chunk'
import flatten from 'lodash/flatten'
import StorageManager from '@worldbrain/storex'

export type StorageContents = { [collection: string]: any[] }

export const mapByChunk = async <T, ReturnType = any>(
    array: T[],
    callback: (chunkEntries: T[], chunkIndex: number) => Promise<ReturnType[]>,
    chunkSize = 10,
): Promise<ReturnType[]> =>
    flatten(await Promise.all(chunk(array, chunkSize).map(callback)))

export const forEachChunkAsync = async <T>(
    array: T[],
    callback: (chunkEntries: T[], chunkIndex: number) => Promise<void>,
    chunkSize = 10,
): Promise<void> => {
    for (const [chunkIndex, chunkEntries] of chunk(
        array,
        chunkSize,
    ).entries()) {
        await callback(chunkEntries, chunkIndex)
    }
}

export function isTermsField(params: {
    collection: string
    field: string
}): boolean {
    return (
        params.field.endsWith('_terms') ||
        params.field.endsWith('Terms') ||
        params.field === 'terms'
    )
}

export function removeTermFieldsFromObject(
    object: any,
    options: { collectionName: string }
) {
    for (const fieldName of Object.keys(object)) {
        if (
            isTermsField({
                collection: options.collectionName,
                field: fieldName,
            })
        ) {
            delete object[fieldName]
        }
    }
}

export function getTermsField(collection: string, fieldName: string) {
    if (!['pages', 'customLists'].includes(collection)) {
        return null
    }

    if (fieldName === 'text') {
        return 'terms'
    }

    if (fieldName === 'fullTitle') {
        return 'titleTerms'
    }

    if (fieldName === 'fullUrl') {
        return 'urlTerms'
    }

    if (fieldName === 'searchableName') {
        return 'nameTerms'
    }

    return null
}

export function createPassiveDataChecker(dependencies: {
    storageManager: StorageManager
}): (
        params: {
            collection: string
            pk: any
        },
    ) => Promise<boolean> {
    return async params => {
        if (params.collection !== 'pages') {
            return false
        }

        const check = async (
            collection: string,
            where: object,
        ): Promise<boolean> => {
            return !!(await dependencies.storageManager
                .collection(collection)
                .countObjects(where))
        }

        return !(
            await check('tags', { url: params.pk }) ||
            await check('bookmarks', { url: params.pk }) ||
            await check('annotations', { pageUrl: params.pk }) ||
            await check('pageListEntries', { pageUrl: params.pk })
        )
    }
}

export async function getStorageContents(
    storageManager: StorageManager,
    options?: { include?: Set<string>; exclude?: Set<string> },
) {
    const exclude = (options && options.exclude) || new Set()

    const storedData: { [collection: string]: any[] } = {}

    const collectionNames =
        (options && options.include) ||
        Object.keys(storageManager.registry.collections)
    for (const collectionName of collectionNames) {
        if (!exclude.has(collectionName)) {
            storedData[collectionName] = await storageManager
                .collection(collectionName)
                .findObjects({})
        }
    }
    return storedData
}

export function getCurrentSchemaVersion(storageManager: StorageManager): Date {
    const schemaVersions = storageManager.registry.getSchemaHistory()
        .map(({ version }) => version.getTime())
        .sort()

    return new Date(schemaVersions[schemaVersions.length - 1])
}

export function isAccessRulesPermissionError(e: Error) {
    if (e.name !== 'FirebaseError') {
        return false
    }
    const firebaseError = e as any
    return firebaseError.code === 'permission-denied'
}
