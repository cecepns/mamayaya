import { useMemo } from 'react'

export function useAuth(currentUser) {
  const role = currentUser?.role || null

  return useMemo(
    () => ({
      user: currentUser,
      role,
      isAdmin: role === 'admin',
      isManager: role === 'manager',
      hasRole: (roles) => roles.includes(role),
      canManageProducts: role === 'manager',
      canCreateOutgoing: role === 'manager' || role === 'admin',
      canEditOutgoing: role === 'manager',
      canInputIncoming: role === 'manager' || role === 'admin',
      canEditIncoming: role === 'manager',
      canApproveIncoming: role === 'admin',
      canViewBookkeeping: role === 'manager',
      canViewNotes: role === 'manager',
      canManageUsers: role === 'manager',
    }),
    [currentUser, role],
  )
}
