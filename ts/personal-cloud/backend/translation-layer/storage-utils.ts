import { FindManyOptions, OperationBatch } from '@worldbrain/storex'
import { LocationSchemeType, DataChangeType } from '../../storage/types'
import {
    PersonalContentMetadata,
    PersonalContentLocator,
} from '../../../web-interface/types/storex-generated/personal-cloud'
import { TranslationLayerDependencies, PersonalCloudUpdatePush } from '../types'
import { extractIdFromAnnotationUrl } from './utils'

export type DeleteReference = {
    collection: string
    id: number | string
    changeInfo?: any
}

export interface DownloadStorageDependencies
    extends Omit<TranslationLayerDependencies, 'getNow'> {}
export interface UploadStorageDependencies
    extends TranslationLayerDependencies {
    deviceId: string | number
}

export class DownloadStorageUtils {
    constructor(protected deps: DownloadStorageDependencies) {}

    async findOne<T = any>(collection: string, where: any): Promise<T> {
        return this.deps.storageManager
            .collection(collection)
            .findObject({ ...where, user: this.deps.userId })
    }

    async findMany<T = any>(
        collection: string,
        where: any,
        options?: FindManyOptions,
    ): Promise<T[]> {
        return this.deps.storageManager.collection(collection).findObjects(
            {
                ...where,
                user: this.deps.userId,
            },
            options,
        )
    }

    async findLocatorForMetadata(
        metadataId: string | number,
        locationScheme = LocationSchemeType.NormalizedUrlV1,
    ): Promise<{
        metadata?: PersonalContentMetadata
        locator?: PersonalContentLocator
    }> {
        const metadata = await this.findOne<
            PersonalContentMetadata & { id: string | number }
        >('personalContentMetadata', { id: metadataId })
        if (!metadata) {
            return {}
        }
        const locator = await this.findOne<PersonalContentLocator>(
            'personalContentLocator',
            {
                personalContentMetadata: metadata.id,
                locationScheme,
            },
        )
        return { metadata, locator }
    }
}

export class UploadStorageUtils extends DownloadStorageUtils {
    constructor(protected deps: UploadStorageDependencies) {
        super(deps)
    }

    async create<T = any>(
        collection: string,
        toCreate: any,
        options?: { changeInfo?: any },
    ): Promise<T> {
        if (!this.deps.deviceId) {
            throw new Error('')
        }
        const now = this.deps.getNow()

        // NOTE: In any operation, userId should overwrite whatever is in the client-side provided object
        // to prevent users from overwriting each others' data
        const batch: OperationBatch = [
            {
                placeholder: 'creation',
                operation: 'createObject',
                collection,
                args: {
                    createdWhen: now,
                    updatedWhen: now,
                    ...toCreate,
                    user: this.deps.userId,
                    createdByDevice: this.deps.deviceId,
                },
            },
            {
                placeholder: 'update-entry',
                operation: 'createObject',
                collection: 'personalDataChange',
                args: maybeWith(
                    {
                        createdWhen: now,
                        user: this.deps.userId,
                        createdByDevice: this.deps.deviceId,
                        type: DataChangeType.Create,
                        collection,
                    },
                    {
                        info: options?.changeInfo,
                    },
                ),
                replace: [
                    {
                        path: 'objectId',
                        placeholder: 'creation',
                    },
                ],
            },
        ]
        const result = await this.deps.storageManager.operation(
            'executeBatch',
            batch,
        )
        const object = result.info.creation.object as T
        return object
    }

    async findOrCreate<T = any>(
        collection: string,
        where: any,
        defaults: any = {},
    ) {
        const existing = await this.findOne<T>(collection, where)
        if (existing) {
            return existing
        }
        return this.create<T>(collection, { ...where, ...defaults })
    }

    async findFirstContentLocator(
        normalizedUrl: string,
        locationScheme = LocationSchemeType.NormalizedUrlV1,
    ) {
        const contentLocator = await this.findOne<
            PersonalContentLocator & {
                id: string | number
                personalContentMetadata: string | number
            }
        >('personalContentLocator', {
            locationScheme,
            location: normalizedUrl,
        })
        return contentLocator
    }

    async findContentMetadata(
        normalizedUrl: string,
        locationScheme = LocationSchemeType.NormalizedUrlV1,
    ) {
        const contentLocator = await this.findFirstContentLocator(
            normalizedUrl,
            locationScheme,
        )
        if (!contentLocator) {
            return { contentMetadata: null, contentLocator: null }
        }
        const contentMetadata = await this.findOne<
            PersonalContentMetadata & { id: string }
        >('personalContentMetadata', {
            id: contentLocator.personalContentMetadata,
        })
        return { contentMetadata, contentLocator }
    }

    async updateById(
        collection: string,
        id: number | string,
        updates: any,
        options?: { changeInfo?: any },
    ) {
        const now = this.deps.getNow()
        const batch: OperationBatch = [
            {
                placeholder: 'update',
                operation: 'updateObjects',
                collection,
                where: { id, user: this.deps.userId },
                updates: {
                    updatedWhen: now,
                    ...updates,
                    user: this.deps.userId,
                },
            },
            {
                placeholder: 'update-entry',
                operation: 'createObject',
                collection: 'personalDataChange',
                args: maybeWith(
                    {
                        createdWhen: now,
                        user: this.deps.userId,
                        createdByDevice: this.deps.deviceId,
                        type: DataChangeType.Modify,
                        collection,
                        objectId: id,
                    },
                    {
                        info: options?.changeInfo,
                    },
                ),
            },
        ]
        await this.deps.storageManager.operation('executeBatch', batch)
    }

    async deleteById(
        collection: string,
        id: number | string,
        changeInfo?: any,
    ) {
        await this.deleteMany([{ collection, id, changeInfo }])
    }

    async deleteMany(references: DeleteReference[]) {
        const batch: OperationBatch = []
        for (const [index, reference] of references.entries()) {
            batch.push({
                placeholder: `deletion-${index}`,
                operation: 'deleteObjects',
                collection: reference.collection,
                where: {
                    user: this.deps.userId,
                    id: reference.id,
                },
            })
            batch.push({
                placeholder: `entry-${index}`,
                operation: 'createObject',
                collection: 'personalDataChange',
                args: maybeWith(
                    {
                        createdWhen: this.deps.getNow(),
                        user: this.deps.userId,
                        createdByDevice: this.deps.deviceId,
                        type: DataChangeType.Delete,
                        collection: reference.collection,
                        objectId: reference.id,
                    },
                    {
                        info: reference.changeInfo,
                    },
                ),
            })
        }
        await this.deps.storageManager.operation('executeBatch', batch)
    }

    async findTagAssociatedData(
        normalizedUrl: string,
    ): Promise<{
        objectId?: string
        collection: 'personalAnnotation' | 'personalContentMetadata'
    }> {
        const annotationId = extractIdFromAnnotationUrl(normalizedUrl)
        if (annotationId == null) {
            const { contentMetadata } = await this.findContentMetadata(
                normalizedUrl,
            )
            return {
                objectId: contentMetadata?.id,
                collection: 'personalContentMetadata',
            }
        }

        const annotation = await this.findOne('personalAnnotation', {
            localId: annotationId,
        })

        return {
            objectId: annotation?.id,
            collection: 'personalAnnotation',
        }
    }
}

function maybeWith(object: any, extras: any) {
    for (const [key, value] of Object.entries(extras)) {
        if (typeof value !== 'undefined' && value !== null) {
            object[key] = value
        }
    }

    return object
}
