<<<<<<< HEAD
=======
import { getAuthToken } from "@/lib/auth";

>>>>>>> origin/codex/build-next.js-admin-dashboard-for-worko-ygwiw2
export type ApiError = {
  message: string;
  status?: number;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

<<<<<<< HEAD
const getToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("worko_admin_token");
};

const buildHeaders = (headers?: HeadersInit) => {
  const token = getToken();
=======
const buildHeaders = (headers?: HeadersInit) => {
  const token = getAuthToken();
>>>>>>> origin/codex/build-next.js-admin-dashboard-for-worko-ygwiw2
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
<<<<<<< HEAD
=======
      cache: "no-store",
>>>>>>> origin/codex/build-next.js-admin-dashboard-for-worko-ygwiw2
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
    login: "/api/v1/admin/auth/login",
    me: "/api/v1/admin/auth/me",
  },
  countries: "/api/v1/admin/countries",
  services: "/api/v1/admin/services",
<<<<<<< HEAD
  pricing: "/api/v1/admin/pricing",
  providers: "/api/v1/admin/providers",
  jobs: "/api/v1/admin/jobs",
  ratings: "/api/v1/admin/ratings",
=======
  servicesByCountry: (iso2: string) =>
    `/api/v1/admin/services?country=${iso2}`,
  serviceCountryToggle: (serviceId: string, iso2: string) =>
    `/api/v1/admin/services/${serviceId}/countries/${iso2}`,
  pricing: "/api/v1/admin/pricing",
  pricingByCountry: (iso2: string) =>
    `/api/v1/admin/pricing?country=${iso2}`,
  providers: "/api/v1/admin/providers",
  providerDetail: (id: string) => `/api/v1/admin/providers/${id}`,
  providerAction: (id: string, action: string) =>
    `/api/v1/admin/providers/${id}/${action}`,
  jobs: "/api/v1/admin/jobs",
  jobDetail: (id: string) => `/api/v1/admin/jobs/${id}`,
  adminUsers: "/api/v1/admin/admins",
>>>>>>> origin/codex/build-next.js-admin-dashboard-for-worko-ygwiw2
  settings: "/api/v1/admin/settings",
};
