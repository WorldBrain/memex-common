import StorageManager from "@worldbrain/storex";
import { StorageModule, StorageModuleConfig, StorageModuleConstructorArgs } from "@worldbrain/storex-pattern-modules";
import { STORAGE_VERSIONS } from "../../web-interface/storage/versions";
import { User, UserReference } from "../../web-interface/types/users";
// import { collectAccountCollections } from "../../utils";
// import { ACCOUNT_COLLECTIONS } from "../../constants";

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
                    indices: [
                        { field: 'id', pk: true }
                    ]
                },
                userEmail: {
                    version: STORAGE_VERSIONS[0].date,
                    fields: {
                        address: { type: 'string' },
                        isPrimary: { type: 'boolean' },
                        isActive: { type: 'boolean' },
                    },
                    relationships: [
                        { childOf: 'user', reverseAlias: 'emails' }
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
                // userPublicProfile: {
                //     version: STORAGE_VERSIONS[].date,
                //     fields: {

                //     },
                //     relationships: [
                //         { singleChildOf: 'user', reverseAlias: 'publicProfile' }
                //     ],
                // },
            },
            operations: {
                createUser: {
                    operation: 'createObject',
                    collection: 'user'
                },
                updateUser: {
                    operation: 'updateObject',
                    collection: 'user',
                    args: [
                        { id: '$id' },
                        '$updates'
                    ]
                },
                findUserById: {
                    operation: 'findObject',
                    collection: 'user',
                    args: { id: '$id:pk' }
                },
                findUserRights: {
                    operation: 'findObject',
                    collection: 'userRight',
                    args: { user: '$user:pk' }
                }
            },
            accessRules: {
                ownership: {
                    user: {
                        field: 'id',
                        access: ['create', 'update']
                    }
                },
                permissions: {
                    user: {
                        read: { rule: true }
                    }
                }
            }
        }
    }

    async ensureUser(user: User, userReference: UserReference): Promise<User> {
        const foundUser = await this.operation('findUserById', { id: userReference.id })
        if (foundUser) {
            return foundUser
        }

        return (await this.operation('createUser', {
            id: userReference.id,
            ...user
        })).object
    }

    async getUser(userReference: UserReference): Promise<User | null> {
        const foundUser = await this.operation('findUserById', { id: userReference.id })
        return foundUser
    }

    async updateUser(userReference: UserReference, options: { knownStatus?: 'exists' | 'new' }, updates: Partial<User>) {
        const status = options.knownStatus ?? (
            (await this.operation('findUserById', { id: userReference.id }))
                ? 'exists'
                : 'new'
        )
        if (status === 'new') {
            await this.operation('createUser', { id: userReference.id, ...updates })
        } else {
            await this.operation('updateUser', { id: userReference.id, updates })
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
}
