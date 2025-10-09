import { ApiResponse, LoginCredentials, User } from '../types';

const API_BASE_URL = 'http://localhost:3000/api';

class ApiClient {
  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    console.log('🔍 [API] Haciendo request a:', url);
    console.log('🔍 [API] Método:', options.method || 'GET');
    console.log('🔍 [API] Body:', options.body);

    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      console.log('📡 [API] Response status:', response.status);
      console.log('📡 [API] Response ok:', response.ok);
      
      const data = await response.json();
      console.log('📦 [API] Response data:', data);
      
      return data;
    } catch (error) {
      console.error('❌ [API] Error completo:', error);
      console.error('❌ [API] Error message:', error.message);
      console.error('❌ [API] Error name:', error.name);
      
      return {
        ok: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'No se pudo conectar con el servidor. Verifica que esté corriendo en puerto 3000.'
        }
      };
    }
  }

  async login(credentials: LoginCredentials): Promise<ApiResponse<User>> {
    console.log('🚀 [API] Iniciando login con:', credentials.correo);
    return this.fetch<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    return this.fetch<{ user: User }>('/auth/me');
  }

  async logout(): Promise<ApiResponse> {
    return this.fetch('/auth/logout', {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();