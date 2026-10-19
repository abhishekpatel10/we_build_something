import { apiClient } from './client';
import { UserProfile } from './types';

export interface AuthTokens {
  access: string;
  refresh: string;
  user: UserProfile;
}

export async function loginUser(username: string, password: string): Promise<AuthTokens> {
  const data = await apiClient<AuthTokens>('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem('tm_access_token', data.access);
  localStorage.setItem('tm_refresh_token', data.refresh);
  localStorage.setItem('tm_user', JSON.stringify(data.user));
  return data;
}

export async function registerUser(userData: {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}): Promise<any> {
  return apiClient('/api/auth/register/', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export function getCurrentUser(): UserProfile | null {
  const u = localStorage.getItem('tm_user');
  if (!u) return null;
  try {
    return JSON.parse(u);
  } catch {
    return null;
  }
}

export function logoutUser() {
  localStorage.removeItem('tm_access_token');
  localStorage.removeItem('tm_refresh_token');
  localStorage.removeItem('tm_user');
}
