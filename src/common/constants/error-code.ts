export const COMMON_ERROR_CODES = {
  BAD_REQUEST: 'COMMON400',
  UNAUTHORIZED: 'AUTH401',
  FORBIDDEN: 'COMMON403',
  NOT_FOUND: 'COMMON404',
  INTERNAL_SERVER_ERROR: 'COMMON500',
} as const;

export const getCommonErrorCode = (statusCode: number): string => {
  switch (statusCode) {
    case 400:
      return COMMON_ERROR_CODES.BAD_REQUEST;
    case 401:
      return COMMON_ERROR_CODES.UNAUTHORIZED;
    case 403:
      return COMMON_ERROR_CODES.FORBIDDEN;
    case 404:
      return COMMON_ERROR_CODES.NOT_FOUND;
    default:
      return COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR;
  }
};
