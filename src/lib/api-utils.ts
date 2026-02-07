export type ListResponse<T> =
  | T[]
  | { data?: T[]; items?: T[]; results?: T[] };

export const extractList = <T>(response: ListResponse<T> | null | undefined) => {
  if (!response) {
    return [] as T[];
  }
  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response.data)) {
    return response.data;
  }
  if (Array.isArray(response.items)) {
    return response.items;
  }
  if (Array.isArray(response.results)) {
    return response.results;
  }
  return [] as T[];
};

export const extractItem = <T>(response: T | { data?: T } | null | undefined) => {
  if (!response) {
    return null as T | null;
  }
  if (typeof response === "object" && response !== null && "data" in response) {
    return (response as { data?: T }).data ?? null;
  }
  return response as T;
};
