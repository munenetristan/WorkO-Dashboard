import { getAuthToken } from "@/lib/auth";

export type ApiError = {
  message: string;
  status?: number;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const buildHeaders = (headers?: HeadersInit) => {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  } satisfies HeadersInit;
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = await response.json();
      message = data?.message ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw { message, status: response.status } satisfies ApiError;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
};

export const apiClient = {
  get: async <T>(path: string, headers?: HeadersInit) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      headers: buildHeaders(headers),
      cache: "no-store",
    });
    return parseResponse<T>(response);
  },
  post: async <T>(path: string, body?: unknown, headers?: HeadersInit) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: buildHeaders(headers),
      body: body ? JSON.stringify(body) : undefined,
    });
    return parseResponse<T>(response);
  },
  put: async <T>(path: string, body?: unknown, headers?: HeadersInit) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "PUT",
      headers: buildHeaders(headers),
      body: body ? JSON.stringify(body) : undefined,
    });
    return parseResponse<T>(response);
  },
  patch: async <T>(path: string, body?: unknown, headers?: HeadersInit) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "PATCH",
      headers: buildHeaders(headers),
      body: body ? JSON.stringify(body) : undefined,
    });
    return parseResponse<T>(response);
  },
  delete: async <T>(path: string, headers?: HeadersInit) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "DELETE",
      headers: buildHeaders(headers),
    });
    return parseResponse<T>(response);
  },
};

export const apiPaths = {
  auth: {
    login: "/admin/auth/login",
    me: "/admin/auth/me",
  },
  countries: "/admin/countries",
  services: "/admin/services",
  servicesByCountry: (iso2: string) =>
    `/admin/services?country=${iso2}`,
  serviceCountryToggle: (serviceId: string, iso2: string) =>
    `/admin/services/${serviceId}/countries/${iso2}`,
  pricing: "/admin/pricing",
  pricingByCountry: (iso2: string) =>
    `/admin/pricing?country=${iso2}`,
  providers: "/admin/providers",
  providerDetail: (id: string) => `/admin/providers/${id}`,
  providerAction: (id: string, action: string) =>
    `/admin/providers/${id}/${action}`,
  jobs: "/admin/jobs",
  jobDetail: (id: string) => `/admin/jobs/${id}`,
  adminUsers: "/admin/admins",
  settings: "/admin/settings",
};
