export type ApiResponse<T> = {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T;
};

export type PageInfo = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
};

export type PaginatedResult<TItems extends Record<string, unknown>> = TItems & {
  pageInfo: PageInfo;
};

export const DEFAULT_SUCCESS_CODE = 'COMMON200';
export const DEFAULT_SUCCESS_MESSAGE = '요청에 성공했습니다.';

export const createSuccessResponse = <T>(
  result: T,
  code = DEFAULT_SUCCESS_CODE,
  message = DEFAULT_SUCCESS_MESSAGE,
): ApiResponse<T> => ({
  isSuccess: true,
  code,
  message,
  result,
});

export const createErrorResponse = <T>(
  result: T,
  code: string,
  message: string,
): ApiResponse<T> => ({
  isSuccess: false,
  code,
  message,
  result,
});
