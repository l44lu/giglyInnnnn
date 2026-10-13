import { SetMetadata } from '@nestjs/common';

export const BYPASS_RESPONSE_WRAPPER_KEY = 'bypass_response_wrapper';

/**
 * Decorator to explicitly bypass the global ApiResponse wrapper.
 * Used for binary streams, file downloads, or endpoints providing raw HTTP transport.
 * Example: @BypassResponseWrapper()
 */
export const BypassResponseWrapper = () =>
  SetMetadata(BYPASS_RESPONSE_WRAPPER_KEY, true);
