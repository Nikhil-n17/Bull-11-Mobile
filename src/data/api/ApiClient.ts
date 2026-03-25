/**
 * API Client
 * Axios instance with JWT interceptors
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '@/src/core/constants/app.constants';
import { StorageService } from '../storage/StorageService';

/**
 * Backend API Response Wrapper
 * All backend responses follow this structure
 */
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export class ApiClient {
  private client: AxiosInstance;
  private storageService: StorageService;

  constructor(storageService: StorageService) {
    this.storageService = storageService;
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request: Add JWT token
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await this.storageService.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response: Unwrap ApiResponse wrapper and handle errors
    this.client.interceptors.response.use(
      (response) => {
        // Unwrap the ApiResponse<T> wrapper structure
        const apiResponse = response.data as ApiResponse<any>;

        // Check if response follows the ApiResponse structure
        if (apiResponse && typeof apiResponse === 'object' && 'success' in apiResponse) {
          // If success is false, treat as error
          if (!apiResponse.success) {
            throw new Error(apiResponse.message || 'Request failed');
          }
          // Unwrap and return the actual data
          response.data = apiResponse.data;
        }

        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          await this.storageService.clearToken();
        }
        return Promise.reject(this.formatError(error));
      }
    );
  }

  private formatError(error: AxiosError): Error {
    // Try to extract message from ApiResponse structure first
    const apiResponse = error.response?.data as ApiResponse<any>;

    let message: string;
    if (apiResponse && typeof apiResponse === 'object' && 'message' in apiResponse) {
      message = apiResponse.message;
    } else {
      message = (error.response?.data as any)?.message ||
                (error.response?.data as any)?.error ||
                error.message ||
                'Network error';
    }

    return new Error(message);
  }

  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch<T>(url, data);
    return response.data;
  }
}
