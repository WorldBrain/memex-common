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

export interface Dependencies extends TranslationLayerDependencies {}

export class DownloadStorageUtils {
    constructor(protected deps: Dependencies) {}

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
        const allContentLocators = await this.findMany<PersonalContentLocator>(
            'personalContentLocator',
            {
                personalContentMetadata: metadata.id,
            },
        )
        const locator = allContentLocators.find(
            (locator) => locator.locationScheme === locationScheme,
        )
        return { metadata, locator }
    }
}

export class UploadStorageUtils extends DownloadStorageUtils {
    constructor(
        protected deps: Dependencies & { update: PersonalCloudUpdatePush },
    ) {
        super(deps)
    }

    async create(
        collection: string,
        toCreate: any,
        options?: { changeInfo?: any },
    ) {
        if (!this.deps.update) {
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
                    createdByDevice: this.deps.update.deviceId,
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
                        createdByDevice: this.deps.update.deviceId,
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
        const object = result.info.creation.object
        return object
    }

    async findOrCreate(collection: string, where: any, defaults: any = {}) {
        const existing = await this.deps.storageManager
            .collection(collection)
            .findObject({ ...where, user: this.deps.userId })
        if (existing) {
            return existing
        }
        return this.create(collection, { ...where, ...defaults })
    }

    async findFirstContentLocator(
        normalizedUrl: string,
        locationScheme = LocationSchemeType.NormalizedUrlV1,
    ) {
        const contentLocator: PersonalContentLocator & {
            id: string | number
            personalContentMetadata: string | number
        } = await this.findOne('personalContentLocator', {
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
        const contentMetadata = await this.findOne('personalContentMetadata', {
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
                        createdByDevice: this.deps.update.deviceId,
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
                        createdByDevice: this.deps.update.deviceId,
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
