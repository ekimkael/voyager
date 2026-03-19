import type User from '#models/user'
import Role from '#models/role'
import RolePermission from '#models/role_permission'
import UserRoleAssignment from '#models/user_role_assignment'

const MAX_INHERITANCE_DEPTH = 4

export default class PermissionResolver {
  #user: User
  #permissionCache: Set<string> | null = null

  constructor(user: User) {
    this.#user = user
  }

  async can(permissionKey: string): Promise<boolean> {
    const permissions = await this.#resolve()
    return permissions.has(permissionKey)
  }

  async canAny(permissionKeys: string[]): Promise<boolean> {
    const permissions = await this.#resolve()
    return permissionKeys.some((key) => permissions.has(key))
  }

  async canAll(permissionKeys: string[]): Promise<boolean> {
    const permissions = await this.#resolve()
    return permissionKeys.every((key) => permissions.has(key))
  }

  async permissions(): Promise<Set<string>> {
    return this.#resolve()
  }

  clearCache() {
    this.#permissionCache = null
  }

  async #resolve(): Promise<Set<string>> {
    if (this.#permissionCache) {
      return this.#permissionCache
    }

    const assignments = await UserRoleAssignment.query()
      .where('user_id', this.#user.id)
      .where((query) => {
        query.whereNull('expires_at').orWhere('expires_at', '>', new Date())
      })

    const allRoleIds = new Set<string>()
    for (const assignment of assignments) {
      await this.#collectRoleChain(assignment.roleId, allRoleIds, 0)
    }

    if (allRoleIds.size === 0) {
      this.#permissionCache = new Set()
      return this.#permissionCache
    }

    const rolePermissions = await RolePermission.query()
      .whereIn('role_id', [...allRoleIds])
      .preload('permission')

    const permissionKeys = new Set<string>()
    for (const rp of rolePermissions) {
      permissionKeys.add(`${rp.permission.resource}:${rp.permission.action}`)
    }

    this.#permissionCache = permissionKeys
    return this.#permissionCache
  }

  async #collectRoleChain(roleId: string, collected: Set<string>, depth: number) {
    if (depth >= MAX_INHERITANCE_DEPTH || collected.has(roleId)) {
      return
    }

    collected.add(roleId)

    const role = await Role.find(roleId)
    if (role?.parentRoleId) {
      await this.#collectRoleChain(role.parentRoleId, collected, depth + 1)
    }
  }
}
