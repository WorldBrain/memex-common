import camelCase from 'lodash/camelCase'
import kebabCase from 'lodash/kebabCase'

export type AutoPkStorageReference<ReferenceType extends string> = {
    type: ReferenceType
    id: number | string
}

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

export function autoPkReferenceFromLinkId<ReferenceType extends string>(
    type: ReferenceType, id: string, options: { autoPkType: 'number' | 'string' }
): AutoPkStorageReference<ReferenceType> {
    let parsedId: string | number = id
    if (options.autoPkType === 'number') {
        parsedId = parseInt(parsedId)
        if (isNaN(parsedId)) {
            parsedId = id
        }
    }

    return { type, id: parsedId }
}

export type ObjectWithReferences<Object, ObjectReference extends AutoPkStorageReference<string>, Relations extends {[FieldName: string]: string}> = (
    Object &
    { reference: ObjectReference } &
    {[K in keyof Relations]: AutoPkStorageReference<Relations[K]>}
)

export function augmentObjectWithReferences<
    Object, ObjectReference extends AutoPkStorageReference<string>, Relations extends {[FieldName: string]: string}
>(object: (Object & {[RelationField in keyof Relations]: number | string}) | null, referenceType: ObjectReference['type'], relations: Relations): null | ObjectWithReferences<Object, ObjectReference, Relations> {
    if (!object) {
        return null
    }
    const relationReferences: {[FieldName in keyof Relations]: AutoPkStorageReference<Relations[FieldName]>} = {} as any
    for (const [fieldName, referenceType] of Object.entries(relations)) {
        relationReferences[fieldName as keyof Relations] = {type: referenceType, id: object[fieldName]} as any
    }
    const augmented = { reference: { type: referenceType, id: object.id }, ...object, ...relationReferences }
    delete augmented.id
    return augmented as any
}

export function getStorageReferenceCollection(reference: AutoPkStorageReference<string>) {
    return camelCase(reference.type.replace(/-reference$/, ''))
}

export function makeStorageReference<Reference extends AutoPkStorageReference<string>>(collection: string, id: number | string): Reference {
    return { type: kebabCase(collection) + '-reference', id } as any
}
