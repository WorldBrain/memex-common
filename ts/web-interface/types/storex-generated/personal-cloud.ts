import type { LocationSchemeType } from '../../../personal-cloud/storage/types'

export type PersonalDeviceInfo =
    {
        type: string
        os: string
        browser: string
        product: string
        name?: string
        createdWhen: number
        updatedWhen: number
    }

export type PersonalDataChange =
    {
        type: string
        collection: string
        objectId: string
        info?: any
        createdWhen: number
    }

export type PersonalAnnotation =
    {
        localId: string
        body?: string
        comment?: string
        createdWhen: number
        updatedWhen: number
    }

export type PersonalAnnotationSelector =
    {
        selector: any
        createdWhen: number
        updatedWhen: number
    }

export type PersonalTextTemplate =
    {
        localId: string
        title: string
        code: string
        isFavourite: boolean
        createdWhen: number
        updatedWhen: number
    }

export type PersonalAnnotationPrivacyLevel =
    {
        privacyLevel: number
        createdWhen: number
        updatedWhen: number
    }

export type PersonalListShare =
    {
        createdWhen: number
        updatedWhen: number
    }

export type PersonalAnnotationShare =
    {
        excludeFromLists?: boolean
        createdWhen: number
        updatedWhen: number
    }

export type PersonalList =
    {
        name: string
        localId: string
        isDeletable?: boolean
        isNestable?: boolean
        createdWhen: number
        updatedWhen: number
    }

export type PersonalListDescription =
    {
        description: string
        createdWhen: number
        updatedWhen: number
    }

export type PersonalListEntry =
    {
        createdWhen: number
        updatedWhen: number
    }

export type PersonalListEntryDescription =
    {
        description: string
        createdWhen: number
        updatedWhen: number
    }

export type PersonalContentMetadata =
    {
        canonicalUrl: string
        title: string
        lang?: string
        description?: string
        createdWhen: number
        updatedWhen: number
    }

export type PersonalContentLocator =
    {
        locationType: string
        location: string
        format: string
        originalLocation: string
        locationScheme: LocationSchemeType
        primary: boolean
        valid: boolean
        version: number
        fingerprint?: string
        lastVisited?: number
        contentSize?: number
        createdWhen: number
        updatedWhen: number
    }

export type PersonalContentRead =
    {
        readWhen: number
        readDuration?: number
        progressPercentage?: number
        scrollTotal?: number
        scrollProgress?: number
        pageTotal?: number
        pageProgress?: number
        durationTotal?: number
        durationProgress?: number
        createdWhen: number
        updatedWhen: number
    }

export type PersonalBookmark =
    {
        normalizedPageUrl: string
        createdWhen: number
        updatedWhen: number
    }

export type PersonalTag =
    {
        name: string
        createdWhen: number
        updatedWhen: number
    }

export type PersonalTagConnection =
    {
        collection: string
        objectId: string
        createdWhen: number
        updatedWhen: number
    }
