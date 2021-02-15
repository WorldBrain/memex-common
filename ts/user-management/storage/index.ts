import StorageManager from '@worldbrain/storex'
import {
    StorageModule,
    StorageModuleConfig,
    StorageModuleConstructorArgs,
} from '@worldbrain/storex-pattern-modules'
import { STORAGE_VERSIONS } from '../../web-interface/storage/versions'
import { User, UserReference } from '../../web-interface/types/users'
import { UserPublicProfile } from '../../web-interface/types/storex-generated/user-management'

export default class UserStorage extends StorageModule {
    private storageManager: StorageManager

    constructor(options: StorageModuleConstructorArgs) {
        super(options)

        this.storageManager = options.storageManager
    }

    getConfig(): StorageModuleConfig {
        return {
            collections: {
                user: {
                    version: STORAGE_VERSIONS[0].date,
                    fields: {
                        id: { type: 'string' },
                        displayName: { type: 'string', optional: true },
                    },
                    indices: [{ field: 'id', pk: true }],
                },
                userEmail: {
                    version: STORAGE_VERSIONS[0].date,
                    fields: {
                        address: { type: 'string' },
                        isPrimary: { type: 'boolean' },
                        isActive: { type: 'boolean' },
                    },
                    relationships: [
                        { childOf: 'user', reverseAlias: 'emails' },
                    ],
                },
                // userRight: {
                //     version: STORAGE_VERSIONS[0].date,
                //     fields: {
                //         canCreateProjects: { type: 'boolean', optional: true },
                //     },
                //     relationships: [
                //         { childOf: 'user', reverseAlias: 'rights' }
                //     ]
                // },
                userPublicProfile: {
                    version: STORAGE_VERSIONS[6].date,
                    fields: {
                        websiteURL: { type: 'string', optional: true },
                        mediumURL: { type: 'string', optional: true },
                        twitterURL: { type: 'string', optional: true },
                        substackURL: { type: 'string', optional: true },
                        bio: { type: 'string', optional: true },
                        avatarURL: { type: 'string', optional: true },
                        paymentPointer: { type: 'string', optional: true },
                    },
                    relationships: [
                        {
                            singleChildOf: 'user',
                            reverseAlias: 'publicProfile',
                        },
                    ],
                    indices: [{ field: { relationship: 'user' }, pk: true }],
                },
            },
            operations: {
                createUser: {
                    operation: 'createObject',
                    collection: 'user',
                },
                updateUser: {
                    operation: 'updateObject',
                    collection: 'user',
                    args: [{ id: '$id' }, '$updates'],
                },
                findUserById: {
                    operation: 'findObject',
                    collection: 'user',
                    args: { id: '$id:pk' },
                },
                createUserPublicProfile: {
                    operation: 'createObject',
                    collection: 'userPublicProfile',
                },
                updateUserPublicProfile: {
                    operation: 'updateObjects',
                    collection: 'userPublicProfile',
                    args: [{ user: '$user' }, '$updates'],
                },
                findUserPublicProfileById: {
                    operation: 'findObject',
                    collection: 'userPublicProfile',
                    args: { user: '$user:pk' },
                },
                // findUserRights: {
                //     operation: 'findObject',
                //     collection: 'userRight',
                //     args: { user: '$user:pk' }
                // }
            },
            accessRules: {
                ownership: {
                    user: {
                        field: 'id',
                        access: ['create', 'update'],
                    },
                    userPublicProfile: {
                        field: 'user',
                        access: ['create', 'update'],
                    },
                },
                permissions: {
                    user: {
                        read: { rule: true },
                    },
                    userPublicProfile: {
                        read: { rule: true },
                    },
                },
            },
        }
    }

    async ensureUser(user: User, userReference: UserReference): Promise<User> {
        const foundUser = await this.operation('findUserById', {
            id: userReference.id,
        })
        if (foundUser) {
            return foundUser
        }

        return (
            await this.operation('createUser', {
                id: userReference.id,
                displayName: user.displayName ?? null,
            })
        ).object
    }

    async getUser(userReference: UserReference): Promise<User | null> {
        const foundUser = await this.operation('findUserById', {
            id: userReference.id,
        })
        return foundUser
    }

    async updateUser(
        userReference: UserReference,
        options: { knownStatus?: 'exists' | 'new' },
        updates: Partial<User>,
    ) {
        const status =
            options.knownStatus ??
            ((await this.operation('findUserById', { id: userReference.id }))
                ? 'exists'
                : 'new')
        if (status === 'new') {
            await this.operation('createUser', {
                id: userReference.id,
                ...updates,
            })
        } else {
            await this.operation('updateUser', {
                id: userReference.id,
                updates,
            })
        }
    }

    getUserReference(options: { userID: string | number }): UserReference {
        return { type: 'user-reference', id: options.userID }
    }

    // async deleteUser(userReference: UserReference) {
    //     const promises: Array<Promise<void>> = []

    //     const accountCollections = collectAccountCollections(this.storageManager.registry)
    //     for (const [collectionName, collectedInfo] of Object.entries(accountCollections)) {
    //         const accountCollectionInfo = ACCOUNT_COLLECTIONS[collectionName]
    //         if (accountCollectionInfo.onAccountDelete === 'delete') {
    //             promises.push(this.storageManager.collection(collectionName).deleteObjects({
    //                 [collectedInfo.alias]: userReference.id
    //             }))
    //         }
    //     }
    //     await Promise.all(promises)
    // }

    async ensureUserPublicProfileExists(
        userPublicProfile: UserPublicProfile,
        userReference: UserReference,
    ): Promise<User> {
        const foundProfile = await this.operation('findUserPublicProfileById', {
            user: userReference.id,
        })
        if (foundProfile) {
            return foundProfile
        }

        return (
            await this.operation('createUserPublicProfile', {
                user: userReference.id,
                ...userPublicProfile,
            })
        ).object
    }

    async getUserPublicProfile(
        userReference: UserReference,
    ): Promise<UserPublicProfile> {
        const foundProfile = await this.operation('findUserPublicProfileById', {
            user: userReference.id,
        })
        return foundProfile
    }

    async createOrUpdateUserPublicProfile(
        userReference: UserReference,
        options: { knownStatus?: 'exists' | 'new' },
        updates: Partial<UserPublicProfile>,
    ) {
        const status =
            options.knownStatus ??
            ((await this.operation('findUserPublicProfileById', {
                user: userReference.id,
            }))
                ? 'exists'
                : 'new')
        if (status === 'new') {
            await this.operation('createUserPublicProfile', {
                user: userReference.id,
                ...updates,
            })
        } else {
            await this.operation('updateUserPublicProfile', {
                user: userReference.id,
                updates,
            })
        }
    }
}
