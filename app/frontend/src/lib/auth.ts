import axios, { AxiosError, AxiosInstance } from 'axios';

const authTokenKey = 'token';
const manualLogoutKey = 'isLougOutManual';

function getStoredToken() {
  return window.localStorage.getItem(authTokenKey);
}

function clearStoredAuth() {
  window.localStorage.removeItem(authTokenKey);
  window.localStorage.setItem(manualLogoutKey, 'true');
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const axiosError = error as AxiosError<{ detail?: string }>;
  return axiosError.response?.data?.detail || fallback;
}

class RPApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getCurrentUser() {
    const token = getStoredToken();
    if (!token) {
      return null;
    }

    try {
      const response = await this.client.get(
        '/api/v1/auth/me',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearStoredAuth();
        return null;
      }
      throw new Error(getErrorMessage(error, 'Failed to get user info'));
    }
  }

  async login() {
    const fromUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const params = new URLSearchParams({ from_url: fromUrl });
    window.location.href = `/api/v1/auth/login?${params.toString()}`;
  }

  async logout() {
    try {
      const response = await this.client.get(
        '/api/v1/auth/logout'
      );
      clearStoredAuth();
      window.location.href = response.data.redirect_url || '/';
    } catch (error) {
      clearStoredAuth();
      throw new Error(getErrorMessage(error, 'Failed to logout'));
    }
  }
}

export const authApi = new RPApi();
