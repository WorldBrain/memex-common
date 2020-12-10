import { UserReference } from "../../web-interface/types/users";

export interface ActivityStreamsStorage {
    // Indicates last seen activites, so we can know which ones are new
    updateHomeFeedTimestamp(params: { user: UserReference, timestamp: number }): Promise<{ previousTimestamp: number | null }>
    retrieveHomeFeedTimestamp(params: { user: UserReference }): Promise<{ timestamp: number } | null>
}