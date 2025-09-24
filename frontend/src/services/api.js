import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    // Extract data from standardized response format
    if (response.data && response.data.success !== undefined) {
      return {
        ...response,
        data: response.data.data || response.data
      };
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard'),
  getActivities: () => api.get('/dashboard/activities'),
  getDepartmentStats: () => api.get('/dashboard/departments'),
};

// Departments API
export const departmentsAPI = {
  getAll: () => api.get('/departments'),
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
  getStats: (id) => api.get(`/departments/${id}/stats`),
};

// Teachers API
export const teachersAPI = {
  getAll: () => api.get('/teachers'),
  getById: (id) => api.get(`/teachers/${id}`),
  create: (data) => api.post('/teachers', data),
  update: (id, data) => api.put(`/teachers/${id}`, data),
  delete: (id) => api.delete(`/teachers/${id}`),
  getTimetable: (id) => api.get(`/teachers/${id}/timetable`),
};

// Subjects API
export const subjectsAPI = {
  getAll: () => api.get('/subjects'),
  getById: (id) => api.get(`/subjects/${id}`),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`),
  getByDepartment: (departmentId) => api.get(`/subjects?department=${departmentId}`),
};

// Rooms API
export const roomsAPI = {
  getAll: () => api.get('/rooms'),
  getById: (id) => api.get(`/rooms/${id}`),
  create: (data) => api.post('/rooms', data),
  update: (id, data) => api.put(`/rooms/${id}`, data),
  delete: (id) => api.delete(`/rooms/${id}`),
  getByDepartment: (departmentId) => api.get(`/rooms?department=${departmentId}`),
};

// Subject Offerings API
export const subjectOfferingsAPI = {
  getAll: () => api.get('/subject-offerings'),
  getById: (id) => api.get(`/subject-offerings/${id}`),
  create: (data) => api.post('/subject-offerings', data),
  update: (id, data) => api.put(`/subject-offerings/${id}`, data),
  delete: (id) => api.delete(`/subject-offerings/${id}`),
  getByDepartment: (departmentId) => api.get(`/subject-offerings?department=${departmentId}`),
};

// Timetables API
export const timetablesAPI = {
  getAll: () => api.get('/timetables'),
  getById: (id) => api.get(`/timetables/${id}`),
  generate: (data) => api.post('/timetables/generate', data),
  delete: (id) => api.delete(`/timetables/${id}`),
  validate: (id) => api.get(`/timetables/${id}/validate`),
  getByDepartment: (departmentId, section, semester) => 
    api.get(`/timetables?department=${departmentId}&section=${section}&semester=${semester}`),
};

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verify: () => api.get('/auth/verify'),
  changePassword: (data) => api.put('/auth/change-password', data),
  logout: () => api.post('/auth/logout'),
};

// Students API
export const studentsAPI = {
  getTimetable: () => api.get('/students/timetable'),
  getSubjects: () => api.get('/students/subjects'),
};

export default api;
