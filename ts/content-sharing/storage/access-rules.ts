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
        sharedList: { list: { rule: true }, read: { rule: true } },
        sharedListCreatorInfo: { list: { rule: true }, read: { rule: true } },
        sharedListEntry: {
            list: { rule: true }, read: { rule: true },
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
            list: { rule: true },
            read: { rule: true },
            create: listCreatorRule('$groupKeys.sharedList'),
        },
        sharedListRoleByUser: {
            list: { rule: true },
            read: { rule: true },
            create: listCreatorRule('$newValue.sharedList'),
        },
        sharedPageInfo: { list: { rule: true }, read: { rule: true } },
        sharedAnnotation: { list: { rule: true }, read: { rule: true } },
        sharedAnnotationListEntry: { list: { rule: true }, read: { rule: true } },
    }
}