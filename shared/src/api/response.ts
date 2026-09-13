export type ApiSuccess<T> = { success: true; data: T };

export type ApiPage<T> = {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};

export type ApiErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    requestId: string;
  };
};

export function apiSuccess<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function apiPage<T>(data: T[], page: number, limit: number, totalItems: number): ApiPage<T> {
  const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
    },
  };
}
