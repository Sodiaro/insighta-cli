import axios, { AxiosInstance } from 'axios';
import { API_BASE, loadCredentials, saveCredentials, clearCredentials } from './config.js';

let _client: AxiosInstance | null = null;

export function getClient(): AxiosInstance {
  if (_client) return _client;

  _client = axios.create({ baseURL: API_BASE });

  // Attach access token from credentials
  _client.interceptors.request.use((config) => {
    const creds = loadCredentials();
    if (creds?.access_token) {
      config.headers['Authorization'] = `Bearer ${creds.access_token}`;
    }
    config.headers['X-API-Version'] = '1';
    return config;
  });

  // Auto-refresh on 401
  _client.interceptors.response.use(
    (r) => r,
    async (error) => {
      const original = error.config;
      if (error.response?.status === 401 && !original._retry) {
        original._retry = true;
        const creds = loadCredentials();
        if (!creds?.refresh_token) {
          clearCredentials();
          throw new Error('Session expired. Please run: insighta login');
        }
        try {
          const res = await axios.post(`${API_BASE}/auth/refresh`, {
            refresh_token: creds.refresh_token,
          });
          const { access_token, refresh_token } = res.data;
          saveCredentials({ ...creds, access_token, refresh_token });
          original.headers['Authorization'] = `Bearer ${access_token}`;
          return _client!(original);
        } catch {
          clearCredentials();
          throw new Error('Session expired. Please run: insighta login');
        }
      }
      throw error;
    }
  );

  return _client;
}

export function requireAuth(): void {
  const creds = loadCredentials();
  if (!creds) {
    console.error('Not logged in. Run: insighta login');
    process.exit(1);
  }
}
