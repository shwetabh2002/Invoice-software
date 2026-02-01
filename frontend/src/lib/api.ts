import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// ============ Refresh Token Management ============
// Prevents multiple simultaneous refresh attempts and infinite loops

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const clearAuthAndRedirect = () => {
  if (typeof window === 'undefined') return;
  
  // Clear all auth data
  localStorage.removeItem('auth-storage');
  
  // Only redirect if not already on login page to prevent loops
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
};

// Helper to get token from zustand persisted storage
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed?.state?.token || null;
    }
  } catch (e) {
    console.error('Error reading auth token:', e);
  }
  return null;
};

// Helper to update token in storage
const updateStoredToken = (token: string) => {
  if (typeof window === 'undefined') return;
  
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      parsed.state.token = token;
      localStorage.setItem('auth-storage', JSON.stringify(parsed));
    }
  } catch (e) {
    console.error('Error updating auth token:', e);
  }
};

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors with smart refresh logic
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number };

    // Don't retry if:
    // 1. No config (shouldn't happen but safety check)
    // 2. Already retried this request
    // 3. This IS the refresh request itself (prevent infinite loop!)
    // 4. Not a 401 error
    // 5. On login/auth pages
    if (
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login') ||
      error.response?.status !== 401
    ) {
      return Promise.reject(error);
    }

    // Mark as retried
    originalRequest._retry = true;

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            } else {
              reject(error);
            }
          },
          reject: (err) => reject(err),
        });
      });
    }

    isRefreshing = true;

    try {
      // Create a fresh axios instance for refresh to avoid interceptor loops
      const refreshResponse = await axios.post(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true, timeout: 10000 }
      );

      const newToken = refreshResponse.data?.token;
      
      if (newToken) {
        updateStoredToken(newToken);
        processQueue(null, newToken);
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } else {
        throw new Error('No token in refresh response');
      }
    } catch (refreshError) {
      processQueue(refreshError as Error, null);
      clearAuthAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateMe: (data: any) => api.put('/auth/me', data),
  updatePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/password', { currentPassword, newPassword }),
};

// Clients API
export const clientsApi = {
  getAll: (params?: any) => api.get('/clients', { params }),
  getById: (id: string) => api.get(`/clients/${id}`),
  create: (data: any) => api.post('/clients', data),
  update: (id: string, data: any) => api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
  getInvoices: (id: string, params?: any) => api.get(`/clients/${id}/invoices`, { params }),
  getQuotes: (id: string, params?: any) => api.get(`/clients/${id}/quotes`, { params }),
  addNote: (id: string, content: string) => api.post(`/clients/${id}/notes`, { content }),
};

// Invoices API
export const invoicesApi = {
  getAll: (params?: any) => api.get('/invoices', { params }),
  getById: (id: string) => api.get(`/invoices/${id}`),
  create: (data: any) => api.post('/invoices', data),
  update: (id: string, data: any) => api.put(`/invoices/${id}`, data),
  delete: (id: string) => api.delete(`/invoices/${id}`),
  markAsSent: (id: string) => api.post(`/invoices/${id}/send`),
  copy: (id: string) => api.post(`/invoices/${id}/copy`),
  createCredit: (id: string) => api.post(`/invoices/${id}/credit`),
  addItem: (id: string, item: any) => api.post(`/invoices/${id}/items`, item),
  updateItem: (id: string, itemId: string, item: any) =>
    api.put(`/invoices/${id}/items/${itemId}`, item),
  deleteItem: (id: string, itemId: string) =>
    api.delete(`/invoices/${id}/items/${itemId}`),
};

// Quotes API
export const quotesApi = {
  getAll: (params?: any) => api.get('/quotes', { params }),
  getById: (id: string) => api.get(`/quotes/${id}`),
  create: (data: any) => api.post('/quotes', data),
  update: (id: string, data: any) => api.put(`/quotes/${id}`, data),
  delete: (id: string) => api.delete(`/quotes/${id}`),
  markAsSent: (id: string) => api.post(`/quotes/${id}/send`),
  convert: (id: string, invoiceGroup?: string) =>
    api.post(`/quotes/${id}/convert`, { invoiceGroup }),
  copy: (id: string) => api.post(`/quotes/${id}/copy`),
};

// Payments API
export const paymentsApi = {
  getAll: (params?: any) => api.get('/payments', { params }),
  getById: (id: string) => api.get(`/payments/${id}`),
  create: (data: any) => api.post('/payments', data),
  update: (id: string, data: any) => api.put(`/payments/${id}`, data),
  delete: (id: string) => api.delete(`/payments/${id}`),
};

// Products API
export const productsApi = {
  getAll: (params?: any) => api.get('/products', { params }),
  getById: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

// Settings API
export const settingsApi = {
  getAll: () => api.get('/settings'),
  get: (key: string) => api.get(`/settings/${key}`),
  update: (key: string, value: any, category?: string) =>
    api.put(`/settings/${key}`, { value, category }),
  bulkUpdate: (settings: Record<string, any>) =>
    api.post('/settings/bulk', { settings }),
};

// Dashboard API
export const dashboardApi = {
  get: (period?: string) => api.get('/dashboard', { params: { period } }),
  getCharts: (year?: number) => api.get('/dashboard/charts', { params: { year } }),
};

// Tax Rates API
export const taxRatesApi = {
  getAll: () => api.get('/tax-rates'),
  create: (data: any) => api.post('/tax-rates', data),
  update: (id: string, data: any) => api.put(`/tax-rates/${id}`, data),
  delete: (id: string) => api.delete(`/tax-rates/${id}`),
};

// Number Series API (formerly Invoice Groups)
export const invoiceGroupsApi = {
  getAll: (type?: 'invoice' | 'quotation') => api.get('/invoice-groups', { params: { type } }),
  create: (data: any) => api.post('/invoice-groups', data),
  update: (id: string, data: any) => api.put(`/invoice-groups/${id}`, data),
  delete: (id: string) => api.delete(`/invoice-groups/${id}`),
};

// Payment Methods API
export const paymentMethodsApi = {
  getAll: () => api.get('/payment-methods'),
  create: (data: any) => api.post('/payment-methods', data),
  update: (id: string, data: any) => api.put(`/payment-methods/${id}`, data),
  delete: (id: string) => api.delete(`/payment-methods/${id}`),
};

// PDF API
export const pdfApi = {
  generateInvoice: (id: string) => api.get(`/pdf/invoice/${id}`),
  downloadInvoice: (id: string) => `${API_URL}/pdf/invoice/${id}/download`,
  generateQuote: (id: string) => api.get(`/pdf/quote/${id}`),
  downloadQuote: (id: string) => `${API_URL}/pdf/quote/${id}/download`,
  emailInvoice: (id: string) => api.post(`/pdf/invoice/${id}/email`),
  emailQuote: (id: string) => api.post(`/pdf/quote/${id}/email`),
};

// Users API (admin)
export const usersApi = {
  getAll: () => api.get('/users'),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export default api;
