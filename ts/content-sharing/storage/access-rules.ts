import { RulePreparation, PermissionRule, AccessRules } from "@worldbrain/storex-pattern-modules"
import { SharedListRoleID } from "../types"

function listCreatorRule(listIdAccess: string): PermissionRule {
    return {
        prepare: [
            findListPreparation(listIdAccess)
        ],
        rule: { eq: ['$list.creator', '$context.userId'] }
    }
}

function listCreatorOrRoleRule(listIdAccess: string, minimalRole: SharedListRoleID): PermissionRule {
    return {
        prepare: [
            findListPreparation(listIdAccess),
            findRolePreparation({
                sharedList: listIdAccess,
                user: '$context.userId',
            })
        ],
        rule: {
            and: ['$ownership', {
                or: [
                    { eq: ['$list.creator', '$value.creator'] },
                    { and: [{ exists: '$role' }, { ge: ['$role.roleID', minimalRole] }] }
                ]
            }]
        }
    }
}

function findListPreparation(listIdAccess: string): RulePreparation {
    return {
        placeholder: 'list', operation: 'findObject', collection: 'sharedList', where: {
            id: listIdAccess,
        }
    }
}

function findRolePreparation(params: { sharedList: string, user: string }): RulePreparation {
    return {
        placeholder: 'role', operation: 'findObject', collection: 'sharedListRole', where: {
            sharedList: params.sharedList,
            user: params.user,
        }
    }
}

export const CONTENT_SHARING_STORAGE_ACCESS_RULES: AccessRules = {
    ownership: {
        sharedList: {
            field: 'creator',
            access: ['create', 'update', 'delete'],
        },
        sharedListCreatorInfo: {
            field: 'creator',
            access: ['create', 'update', 'delete'],
        },
        sharedListEntry: {
            field: 'creator',
            access: ['create', 'update', 'delete'],
        },
        sharedPageInfo: {
            field: 'creator',
            access: ['create', 'update', 'delete'],
        },
        sharedAnnotation: {
            field: 'creator',
            access: ['create', 'update', 'delete'],
        },
        sharedAnnotationListEntry: {
            field: 'creator',
            access: ['create', 'update', 'delete'],
        },
    },
    permissions: {
        sharedList: { read: { rule: true } },
        sharedListCreatorInfo: { read: { rule: true } },
        sharedListEntry: {
            read: { rule: true },
            create: listCreatorOrRoleRule('$value.sharedList', SharedListRoleID.AddOnly),
            update: listCreatorOrRoleRule('$value.sharedList', SharedListRoleID.AddOnly),
            delete: listCreatorOrRoleRule('$value.sharedList', SharedListRoleID.AddOnly),
        },
        sharedListKey: {
            list: listCreatorRule('$groupKeys.sharedList'),
            read: listCreatorRule('$groupKeys.sharedList'),
            create: listCreatorRule('$groupKeys.sharedList'),
            update: listCreatorRule('$groupKeys.sharedList'),
            delete: listCreatorRule('$groupKeys.sharedList'),
        },
        sharedListRole: {
            read: { rule: true },
            create: listCreatorRule('$groupKeys.sharedList'),
        },
        sharedListRoleByUser: {
            read: { rule: true },
            create: listCreatorRule('$newValue.sharedList'),
        },
        sharedPageInfo: { read: { rule: true } },
        sharedAnnotation: { read: { rule: true } },
        sharedAnnotationListEntry: {
            read: { rule: true },
            create: listCreatorOrRoleRule('$value.sharedList', SharedListRoleID.AddOnly),
            update: listCreatorOrRoleRule('$value.sharedList', SharedListRoleID.AddOnly),
            delete: listCreatorOrRoleRule('$value.sharedList', SharedListRoleID.AddOnly),
        },
    }
}