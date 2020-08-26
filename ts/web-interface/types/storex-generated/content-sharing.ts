export type SharedList =
    {
        createdWhen: number
        updatedWhen: number
        title: string
        description?: string
    }

export type SharedListCreatorInfo =
    {
        localListId: number
    }

export type SharedListEntry =
    {
        createdWhen: number
        updatedWhen: number
        entryTitle: string
        normalizedUrl: string
        originalUrl: string
    }

export type SharedPageInfo =
    {
        createdWhen: number
        updatedWhen: number
        normalizedUrl: string
        originalUrl: string
        fullTitle: string
    }

export type SharedAnnotation =
    {
        normalizedPageUrl: string
        createdWhen: number
        uploadedWhen: number
        updatedWhen: number
        body?: string
        comment?: string
        selector?: string
    }

export type SharedAnnotationListEntry =
    {
        createdWhen: number
        uploadedWhen: number
        updatedWhen: number
        normalizedPageUrl: string
    }
