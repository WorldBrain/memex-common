export type ConversationThread =
    {
        updatedWhen: number
        normalizedPageUrl: string
    }

export type ConversationReply =
    {
        createdWhen: number
        normalizedPageUrl: string
        content: string
    }
