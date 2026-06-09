const BASE_URL = 'http://localhost:4000/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const handleResponse = async (response) => {
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new Error(text || 'Something went wrong');
  }
  if (!response.ok) {
    throw new Error(json.message || json.error || 'Something went wrong');
  }
  return json;
};

export const api = {
  login: async (email, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },
  register: async (data) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },
  getMe: async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },
  getUniversities: async () => {
    const res = await fetch(`${BASE_URL}/universities`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },
  getPopularUniversities: async () => {
    const res = await fetch(`${BASE_URL}/universities/popular`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },
  getPrograms: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const res = await fetch(`${BASE_URL}/programs?${params.toString()}`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },
  getRecommendations: async (studentId) => {
    const res = await fetch(`${BASE_URL}/recommendations/${studentId}`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },
  getApplications: async () => {
    const res = await fetch(`${BASE_URL}/applications`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  },
  createApplication: async (programId, intake) => {
    const res = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ programId, intake })
    });
    return handleResponse(res);
  },
  updateApplicationStatus: async (applicationId, status, note) => {
    const res = await fetch(`${BASE_URL}/applications/${applicationId}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, note })
    });
    return handleResponse(res);
  },
  getDashboardOverview: async () => {
    const res = await fetch(`${BASE_URL}/dashboard/overview`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};
