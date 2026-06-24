import { api } from './api'

export const get = (url, params) => api.get(url, { params })
export const post = (url, payload) => api.post(url, payload)
export const put = (url, payload) => api.put(url, payload)
export const del = (url) => api.delete(url)
