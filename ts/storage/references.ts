export type StorageReference<ReferenceType extends string> = {
    type: ReferenceType
}

export type AutoPkStorageReference<Type> = Type & { id: string | number }

export function idFromAutoPkReference(reference: { id: number | string }, options: { autoPkType: 'number' | 'string' }): number | string {
    let id = reference.id
    if (options.autoPkType === 'number' && typeof id === 'string') {
        id = parseInt(id)
        if (isNaN(id)) {
            id = reference.id
        }
    }
    return id
}

export function autoPkReferenceFromLinkId<ReferenceType extends string>(type: ReferenceType, id: string, options: { autoPkType: 'number' | 'string' }): AutoPkStorageReference<StorageReference<ReferenceType>> {
    let parsedId: string | number = id
    if (options.autoPkType === 'number') {
        parsedId = parseInt(parsedId)
        if (isNaN(parsedId)) {
            parsedId = id
        }
    }

    return { type, id: parsedId }
}
