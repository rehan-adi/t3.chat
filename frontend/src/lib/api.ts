const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = "/signin";
      throw new ApiError(401, "Unauthorized");
    }

    const errorText = await response.text();
    throw new ApiError(response.status, errorText || response.statusText);
  }

  return response.json();
}

export const authApi = {
  requestOtp: async (email: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/request-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });

    return handleResponse(response);
  },

  verifyOtp: async (
    email: string,
    otp: string,
  ): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, otp }),
    });

    return handleResponse(response);
  },

  logout: async (): Promise<void> => {
    await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    window.location.href = "/signin";
  },
};

export interface CreditInfo {
  remaining: number;
  total: number;
}

export const creditApi = {
  getCredits: async (): Promise<CreditInfo> => {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/credit/check-credits`,
      {
        credentials: "include",
      },
    );

    const json = await handleResponse<{
      success: boolean;
      credits: number;
      resetApplied: boolean;
    }>(response);

    // For now, we'll use credits as remaining and calculate total based on premium status
    // This will be updated when we get user info
    return {
      remaining: json.credits,
      total: 20, // Will be updated from account info
    };
  },
};

export interface AccountSettings {
  id: string;
  email: string;
  name: string | null;
  credits: number;
  isPremium: boolean;
  profilePicture: string | null;
  isEmailVerified: boolean;
  isbillingPreferencesEnable: boolean;
}

export interface SubscriptionInfo {
  plan: string;
  status: string;
  renewsAt: string;
}

export const settingsApi = {
  getAccount: async (): Promise<AccountSettings> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/settings/account`, {
      credentials: "include",
    });

    const json = await handleResponse<{
      success: boolean;
      message: string;
      data: AccountSettings;
    }>(response);

    return json.data;
  },

  getSubscription: async (): Promise<SubscriptionInfo> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/subscription`, {
      credentials: "include",
    });

    return handleResponse(response);
  },
};

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  pinned?: boolean;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface UserDetails {
  id: string;
  name: string;
  isPremium: boolean;
  profilePicture: string | null;
}

export interface ConversationsListResponse {
  user: UserDetails;
  conversations: Conversation[];
}

export const conversationsApi = {
  list: async (): Promise<ConversationsListResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/conversations`, {
      credentials: "include",
    });

    const json = await handleResponse<{
      success: boolean;
      message: string;
      data: ConversationsListResponse;
    }>(response);

    return json.data;
  },

  get: async (id: string): Promise<Conversation> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/conversations/${id}`, {
      credentials: "include",
    });

    const json = await handleResponse<{
      success: boolean;
      message: string;
      data: Conversation;
    }>(response);

    return json.data;
  },

  create: async (title?: string): Promise<Conversation> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title }),
    });

    const json = await handleResponse<{
      success: boolean;
      message: string;
      data: Conversation;
    }>(response);

    return json.data;
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/conversations/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/signin";
        throw new ApiError(401, "Unauthorized");
      }
      const errorText = await response.text();
      throw new ApiError(response.status, errorText || response.statusText);
    }
  },

  togglePin: async (id: string, pinned: boolean): Promise<void> => {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/conversations/${id}/pin`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pinned }),
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/signin";
        throw new ApiError(401, "Unauthorized");
      }
      const errorText = await response.text();
      throw new ApiError(response.status, errorText || response.statusText);
    }
  },

  update: async (id: string, title: string): Promise<Conversation> => {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/conversations/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title }),
      },
    );

    const json = await handleResponse<{
      success: boolean;
      message: string;
      data: Conversation;
    }>(response);

    return json.data;
  },
};

export interface ApiKeyInfo {
  byokEnable: boolean;
  apiKey: {
    id: string;
    maskedKey: string;
    createdAt: string;
  } | null;
}

export const apiKeysApi = {
  get: async (): Promise<ApiKeyInfo> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/settings/api-keys`, {
      credentials: "include",
    });

    const json = await handleResponse<{
      success: boolean;
      message: string;
      data: ApiKeyInfo;
    }>(response);

    return json.data;
  },

  create: async (key: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/settings/api-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ key }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/signin";
        throw new ApiError(401, "Unauthorized");
      }
      const errorText = await response.text();
      throw new ApiError(response.status, errorText || response.statusText);
    }
  },

  delete: async (): Promise<void> => {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/settings/api-keys/delete`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "/signin";
        throw new ApiError(401, "Unauthorized");
      }
      const errorText = await response.text();
      throw new ApiError(response.status, errorText || response.statusText);
    }
  },
};

export interface InitSubscriptionResponse {
  success: boolean;
  message: string;
  data: {
    entity: string;
    order_id: string;
    order_amount: number;
    order_status: string;
    order_currency: string;
    order_expiry_time: string;
    payment_session_id: string;
  };
}

export interface VerifySubscriptionResponse {
  success: boolean;
  status?: string;
  message?: string;
}

export const subscriptionApi = {
  initiateSubscription: async (
    planId: string,
  ): Promise<InitSubscriptionResponse> => {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/subscription/init-subscription`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planId }),
      },
    );

    return handleResponse(response);
  },

  verifySubscription: async (
    orderId: string,
  ): Promise<VerifySubscriptionResponse> => {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/subscription/verify/${orderId}`,
      {
        credentials: "include",
      },
    );

    return handleResponse(response);
  },
};

export interface ModelInfo {
  id: string;
  name: string;
  isPaid: boolean;
}

export const modelsApi = {
  list: async (): Promise<ModelInfo[]> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/models`, {
      credentials: "include",
    });

    const json = await handleResponse<{
      success: boolean;
      message?: string;
      data: ModelInfo[];
    }>(response);

    return json.data;
  },
};

export const getApiBaseUrl = () => API_BASE_URL;
