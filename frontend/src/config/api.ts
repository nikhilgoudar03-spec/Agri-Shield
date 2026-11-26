export const API_BASE = '/api/v1';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('agrishield_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('agrishield_token', token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem('agrishield_token');
  localStorage.removeItem('agrishield_user');
};

export const getAuthenticatedImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  const token = getAuthToken();
  if (!token) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}
