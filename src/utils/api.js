import axios from 'axios'
import { API_ENDPOINTS } from './endpoints'

export const TOKEN_KEY = 'mamaya_id_token'
export const USER_KEY = 'mamaya_id_user'

export const api = axios.create({
  // baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  baseURL: import.meta.env.VITE_API_URL || 'https://api.kingcreativestudio.my.id/mamayaya-id/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const apiService = {
  login: (payload) => api.post(API_ENDPOINTS.AUTH.LOGIN, payload),
  me: () => api.get(API_ENDPOINTS.AUTH.ME),

  getDashboard: () => api.get(API_ENDPOINTS.DASHBOARD),
  getUsers: (params) => api.get(API_ENDPOINTS.USERS.LIST, { params }),
  createUser: (payload) => api.post(API_ENDPOINTS.USERS.LIST, payload),
  updateUser: (id, payload) => api.put(API_ENDPOINTS.USERS.DETAIL(id), payload),
  deleteUser: (id) => api.delete(API_ENDPOINTS.USERS.DETAIL(id)),

  getProducts: (params) => api.get(API_ENDPOINTS.PRODUCTS.LIST, { params }),
  getProductCost: (id, params) => api.get(API_ENDPOINTS.PRODUCTS.COST(id), { params }),
  createProduct: (payload) => api.post(API_ENDPOINTS.PRODUCTS.LIST, payload),
  updateProduct: (id, payload) => api.put(API_ENDPOINTS.PRODUCTS.DETAIL(id), payload),
  deleteProduct: (id) => api.delete(API_ENDPOINTS.PRODUCTS.DETAIL(id)),
  bulkInsertProducts: (payload) => api.post(API_ENDPOINTS.PRODUCTS.BULK, payload),

  getIncoming: (params) => api.get(API_ENDPOINTS.INCOMING.LIST, { params }),
  createIncoming: (payload) => api.post(API_ENDPOINTS.INCOMING.LIST, payload),
  bulkInsertIncoming: (payload) => api.post(API_ENDPOINTS.INCOMING.BULK, payload),
  approveIncoming: (id) => api.post(API_ENDPOINTS.INCOMING.APPROVE(id)),
  rejectIncoming: (id) => api.post(API_ENDPOINTS.INCOMING.REJECT(id)),
  bulkApproveIncoming: (payload) => api.post(API_ENDPOINTS.INCOMING.BULK_APPROVE, payload),
  updateIncoming: (id, payload) => api.put(API_ENDPOINTS.INCOMING.DETAIL(id), payload),
  deleteIncoming: (id) => api.delete(API_ENDPOINTS.INCOMING.DETAIL(id)),

  getOutgoing: (params) => api.get(API_ENDPOINTS.OUTGOING.LIST, { params }),
  createOutgoing: (payload) => api.post(API_ENDPOINTS.OUTGOING.LIST, payload),
  updateOutgoing: (id, payload) => api.put(API_ENDPOINTS.OUTGOING.DETAIL(id), payload),
  deleteOutgoing: (id) => api.delete(API_ENDPOINTS.OUTGOING.DETAIL(id)),

  getNotes: () => api.get(API_ENDPOINTS.NOTES.GET),
  saveNotes: (payload) => api.post(API_ENDPOINTS.NOTES.SAVE, payload),
  resetNotes: () => api.post(API_ENDPOINTS.NOTES.RESET),

  getBookkeeping: (params) => api.get(API_ENDPOINTS.BOOKKEEPING, { params }),
  updateBookkeeping: (payload) => api.post(API_ENDPOINTS.BOOKKEEPING, payload),
  recalculateInventoryCosts: () => api.post(API_ENDPOINTS.INVENTORY.RECALCULATE),

  getActivity: (params) => api.get(API_ENDPOINTS.ACTIVITY, { params }),
}

export default api
