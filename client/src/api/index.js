import api from './axios';

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Events
export const eventsAPI = {
  getAll: (params) => api.get('/events', { params }),
  getOne: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  getStats: (id) => api.get(`/events/${id}/stats`),
  uploadTemplate: (id, formData) => api.post(`/events/${id}/template`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadVideo: (id, formData) => api.post(`/events/${id}/video`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteVideo: (id) => api.delete(`/events/${id}/video`),
  updateCardConfig: (id, data) => api.put(`/events/${id}/card-config`, data),
  updateWebsiteTheme: (id, data) => api.put(`/events/${id}/website-theme`, data),
  updateDressCodeColors: (id, data) => api.put(`/events/${id}/dresscode-colors`, data),
  uploadDressCodeImage: (id, formData) => api.post(`/events/${id}/dresscode`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteDressCodeImage: (id, imageId) => api.delete(`/events/${id}/dresscode/${imageId}`),
  uploadEventPhoto: (id, formData) => api.post(`/events/${id}/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteEventPhoto: (id, photoId) => api.delete(`/events/${id}/photos/${photoId}`),
};

// Guests
export const guestsAPI = {
  getAll: (eventId, params) => api.get(`/guests/event/${eventId}`, { params }),
  getOne: (id) => api.get(`/guests/${id}`),
  add: (eventId, data) => api.post(`/guests/event/${eventId}`, data),
  update: (id, data) => api.put(`/guests/${id}`, data),
  delete: (id) => api.delete(`/guests/${id}`),
  restore: (id) => api.post(`/guests/${id}/restore`),
  deleteAll: (eventId) => api.delete(`/guests/event/${eventId}/all`),
  restoreAll: (eventId) => api.post(`/guests/event/${eventId}/restore-all`),
  import: (eventId, formData) => api.post(`/guests/event/${eventId}/import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  generateQR: (id) => api.post(`/guests/${id}/generate-qr`),
  generateAllQR: (eventId) => api.post(`/guests/event/${eventId}/generate-all-qr`),
  downloadCSV: (eventId) => api.get(`/guests/event/${eventId}/download-csv`, { responseType: 'blob' }),
  resetScan: (id) => api.post(`/guests/${id}/reset-scan`),
};

// Cards
export const cardsAPI = {
  generate: (id) => api.post(`/cards/generate/${id}`),
  generateAll: (eventId) => api.post(`/cards/generate-all/${eventId}`),
  download: (id) => api.get(`/cards/download/${id}`),
};

// Invitations
export const invitationsAPI = {
  sendSMS: (data) => api.post('/invitations/sms', data),
  sendWhatsApp: (data) => api.post('/invitations/whatsapp', data),
  sendBulkSMS: (data) => api.post('/invitations/bulk-sms', data),
  sendBulkWhatsApp: (data) => api.post('/invitations/bulk-whatsapp', data),
  getStats: (eventId) => api.get(`/invitations/stats/${eventId}`),
  testWhatsApp: (data) => api.post('/invitations/test-whatsapp', data),
  inspectTemplate: () => api.get('/invitations/inspect-template'),
};

// RSVP
export const rsvpAPI = {
  confirm: (code) => api.post(`/rsvp/confirm/${code}`),
  decline: (code) => api.post(`/rsvp/decline/${code}`),
  getStats: (eventId) => api.get(`/rsvp/stats/${eventId}`),
};

// Scanner
export const scannerAPI = {
  scan: (data) => api.post('/scanner/scan', data),
  search: (params) => api.get('/scanner/search', { params }),
  getLiveStats: (eventId) => api.get(`/scanner/stats/${eventId}`),
  getEvents: () => api.get('/scanner/events'),
};

// Activity
export const activityAPI = {
  getLogs: (params) => api.get('/activity', { params }),
  getEventLogs: (eventId, params) => api.get(`/activity/event/${eventId}`, { params }),
  getLogStats: () => api.get('/activity/stats'),
  cleanupLogs: (days) => api.delete(`/activity/cleanup`, { params: { days } }),
};

// Settings
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  uploadLogo: (formData) => api.post('/settings/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get('/dashboard'),
  getUpcoming: () => api.get('/dashboard/upcoming'),
};

// Users
export const usersAPI = {
  getScanners: () => api.get('/users/scanners'),
  createScanner: (data) => api.post('/users/scanners', data),
  updateScanner: (id, data) => api.put(`/users/scanners/${id}`, data),
  deleteScanner: (id) => api.delete(`/users/scanners/${id}`),
};

// Reports
export const reportsAPI = {
  downloadEventReport: (eventId) => api.get(`/reports/event/${eventId}`, { responseType: 'blob' }),
};

// Public
export const publicAPI = {
  getEvent: (slug) => api.get(`/public/event/${slug}`),
  getInvitation: (slug, code) => api.get(`/public/event/${slug}/invitation`, { params: { code } }),
};
