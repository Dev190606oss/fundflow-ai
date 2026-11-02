const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('fundflow_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('fundflow_token');
    localStorage.removeItem('fundflow_user');
    window.dispatchEvent(new Event('auth-expired'));
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// 1. Auth API
export const authApi = {
  login: (data: { email: string; password: string }) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: { email: string; password: string; name: string; businessName?: string }) =>
    apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => apiRequest('/auth/me'),
  updateProfile: (data: any) =>
    apiRequest('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
};

// 2. Dashboard API
export const dashboardApi = {
  getStats: () => apiRequest('/dashboard/stats'),
};

// 3. Clients & Projects API
export const clientApi = {
  getAll: () => apiRequest('/clients'),
  getById: (id: string) => apiRequest(`/clients/${id}`),
  create: (data: any) => apiRequest('/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiRequest(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest(`/clients/${id}`, { method: 'DELETE' }),
  createProject: (clientId: string, data: any) =>
    apiRequest(`/clients/${clientId}/projects`, { method: 'POST', body: JSON.stringify(data) }),
};

// 4. Invoices API
export const invoiceApi = {
  getAll: () => apiRequest('/invoices'),
  getById: (id: string) => apiRequest(`/invoices/${id}`),
  create: (data: any) => apiRequest('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiRequest(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  recordManualPayment: (id: string, data: any) =>
    apiRequest(`/invoices/${id}/manual-payment`, { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest(`/invoices/${id}`, { method: 'DELETE' }),
};

// 5. PayPal API
export const paypalApi = {
  createOrder: (invoiceId: string) =>
    apiRequest('/paypal/create-order', { method: 'POST', body: JSON.stringify({ invoiceId }) }),
  captureOrder: (orderId: string, invoiceId: string) =>
    apiRequest('/paypal/capture-order', { method: 'POST', body: JSON.stringify({ orderId, invoiceId }) }),
  getHistory: () => apiRequest('/paypal/history'),
};

// 6. Loans API (Borrow & Lend)
export const loanApi = {
  getAll: () => apiRequest('/loans'),
  create: (data: any) => apiRequest('/loans', { method: 'POST', body: JSON.stringify(data) }),
  addRepayment: (id: string, data: any) =>
    apiRequest(`/loans/${id}/repayments`, { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest(`/loans/${id}`, { method: 'DELETE' }),
};

// 7. Investments & Savings API
export const investmentApi = {
  getWatchlist: () => apiRequest('/investments/watchlist'),
  createOpportunity: (data: any) =>
    apiRequest('/investments/watchlist', { method: 'POST', body: JSON.stringify(data) }),
  deleteOpportunity: (id: string) =>
    apiRequest(`/investments/watchlist/${id}`, { method: 'DELETE' }),
  getGoals: () => apiRequest('/investments/goals'),
  createGoal: (data: any) =>
    apiRequest('/investments/goals', { method: 'POST', body: JSON.stringify(data) }),
  addContribution: (goalId: string, data: any) =>
    apiRequest(`/investments/goals/${goalId}/contributions`, { method: 'POST', body: JSON.stringify(data) }),
  getReadiness: (params?: { goalId?: string; targetAmount?: number; weeks?: number }) => {
    const query = new URLSearchParams();
    if (params?.goalId) query.set('goalId', params.goalId);
    if (params?.targetAmount) query.set('targetAmount', String(params.targetAmount));
    if (params?.weeks) query.set('weeks', String(params.weeks));
    return apiRequest(`/investments/readiness?${query.toString()}`);
  },
};

// 8. AI API
export const aiApi = {
  generateProjectBrief: (data: { prompt: string; clientName?: string }) =>
    apiRequest('/ai/project-brief', { method: 'POST', body: JSON.stringify(data) }),
  generatePoliteReminder: (data: { partyName: string; amount: number; dueDate?: string; type?: string; context?: string }) =>
    apiRequest('/ai/polite-reminder', { method: 'POST', body: JSON.stringify(data) }),
  chat: (data: { message: string; history?: any[] }) =>
    apiRequest('/ai/chat', { method: 'POST', body: JSON.stringify(data) }),
};

// 9. Notifications API
export const notificationApi = {
  getAll: () => apiRequest('/notifications'),
  markAsRead: (id: string) => apiRequest(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllAsRead: () => apiRequest('/notifications/mark-all-read', { method: 'POST' }),
};

// 10. Reports API
export const reportApi = {
  getSummary: () => apiRequest('/reports/summary'),
  getExportUrl: () => `${API_BASE}/reports/export/csv`,
};
