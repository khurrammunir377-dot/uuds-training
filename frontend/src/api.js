const API_BASE = '/api';

export function getAuthToken() {
  return localStorage.getItem('uuds_auth_token') || '';
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('uuds_auth_token', token);
  } else {
    localStorage.removeItem('uuds_auth_token');
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If unauthorized, redirect to login
    setAuthToken(null);
    window.dispatchEvent(new CustomEvent('uuds_auth_unauthorized'));
  }

  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.detail || data?.message || 'API request failed';
    throw new Error(errorMsg);
  }

  return data;
}

// API functions
export const api = {
  // Auth
  login: (username, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: () => apiRequest('/auth/me'),

  // Dashboard
  getDashboardStats: () => apiRequest('/dashboard/stats'),

  // Employees
  getEmployees: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/employees?${query}`);
  },
  getEmployeeProfile: (id) => apiRequest(`/employees/${id}`),
  createEmployee: (data) => apiRequest('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => apiRequest(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id) => apiRequest(`/employees/${id}`, { method: 'DELETE' }),

  // Records
  updateRecord: (recordId, data) => apiRequest(`/records/${recordId}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateEmployeeCourse: (empId, courseId, data) => apiRequest(`/employees/${empId}/courses/${courseId}`, { method: 'POST', body: JSON.stringify(data) }),

  // Courses
  getCourses: () => apiRequest('/courses'),
  createCourse: (data) => apiRequest('/courses', { method: 'POST', body: JSON.stringify(data) }),
  updateCourse: (id, data) => apiRequest(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCourse: (id) => apiRequest(`/courses/${id}`, { method: 'DELETE' }),

  // Reminders & Email
  getReminders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/reminders/list?${query}`);
  },
  sendEmailReminder: (overrideRecipient = null) => apiRequest('/reminders/send-now', {
    method: 'POST',
    body: JSON.stringify({ override_recipient: overrideRecipient })
  }),
  sendManagerEmail: (data) => apiRequest('/reminders/send-manager-email', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getEmailLogs: () => apiRequest('/reminders/logs'),

  // Settings
  getSettings: () => apiRequest('/settings'),
  updateSettings: (settings) => apiRequest('/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),
  testSmtp: () => apiRequest('/settings/test-smtp', { method: 'POST' }),
  reimportData: () => apiRequest('/system/re-import', { method: 'POST' }),

  // Matrix View & Batch Update
  getMatrixData: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/matrix?${query}`);
  },
  batchUpdateMatrix: (data) => apiRequest('/matrix/batch-update', { method: 'POST', body: JSON.stringify(data) }),
};

