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
