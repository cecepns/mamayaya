export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    ME: '/auth/me',
  },
  DASHBOARD: '/dashboard',
  USERS: {
    LIST: '/users',
    DETAIL: (id) => `/users/${id}`,
  },
  PRODUCTS: {
    LIST: '/products',
    DETAIL: (id) => `/products/${id}`,
    COST: (id) => `/products/${id}/cost`,
    BULK: '/products/bulk',
  },
  INCOMING: {
    LIST: '/incoming',
    DETAIL: (id) => `/incoming/${id}`,
    BULK: '/incoming/bulk',
    APPROVE: (id) => `/incoming/${id}/approve`,
    REJECT: (id) => `/incoming/${id}/reject`,
    BULK_APPROVE: '/incoming/bulk-approve',
  },
  OUTGOING: {
    LIST: '/outgoing',
    DETAIL: (id) => `/outgoing/${id}`,
  },
  NOTES: {
    GET: '/notes',
    SAVE: '/notes',
    RESET: '/notes/reset',
  },
  BOOKKEEPING: '/bookkeeping',
  INVENTORY: {
    RECALCULATE: '/inventory/recalculate-costs',
  },
  ACTIVITY: '/activity',
}
