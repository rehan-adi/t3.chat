const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = '/signin';
      throw new ApiError(401, 'Unauthorized');
    }
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || response.statusText);
  }
  return response.json();
}

// Auth API
export const authApi = {
  requestOtp: async (email: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    return handleResponse(response);
  },

  verifyOtp: async (email: string, otp: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, otp }),
    });
    return handleResponse(response);
  },

  logout: async (): Promise<void> => {
    await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    window.location.href = '/signin';
  },
};

// Credit API
export interface CreditInfo {
  remaining: number;
  total: number;
}

export const creditApi = {
  getCredits: async (): Promise<CreditInfo> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/credit`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },
};

// Settings API
export interface AccountSettings {
  email: string;
  name: string;
  createdAt: string;
}

export interface SubscriptionInfo {
  plan: string;
  status: string;
  renewsAt: string;
}

export const settingsApi = {
  getAccount: async (): Promise<AccountSettings> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/settings/account`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  getSubscription: async (): Promise<SubscriptionInfo> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/subscription`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },
};

// Conversations API
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export const conversationsApi = {
  list: async (): Promise<Conversation[]> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/conversations`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  get: async (id: string): Promise<Conversation> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/conversations/${id}`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  create: async (title?: string): Promise<Conversation> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title }),
    });
    return handleResponse(response);
  },
};

export const getApiBaseUrl = () => API_BASE_URL;
