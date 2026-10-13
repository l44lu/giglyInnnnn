/**
 * Common API Success Response Envelope contract matching backend ApiResponse<T>.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

/**
 * Common API Error Response Envelope contract matching backend ApiErrorResponse.
 */
export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  errors?: string[];
  data: null;
}

/**
 * Type guard to safely identify whether an HTTP response payload conforms
 * to the backend's standard ApiResponse envelope contract.
 *
 * Verifies explicit contract markers:
 * 1. payload is an object (non-null)
 * 2. success === true
 * 3. statusCode is a number
 * 4. message is a string
 * 5. 'data' key exists (even if null)
 */
export const isApiResponse = <T = unknown>(
  payload: unknown,
): payload is ApiResponse<T> => {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as Record<string, unknown>).success === true &&
    typeof (payload as Record<string, unknown>).statusCode === "number" &&
    typeof (payload as Record<string, unknown>).message === "string" &&
    "data" in payload
  );
};
