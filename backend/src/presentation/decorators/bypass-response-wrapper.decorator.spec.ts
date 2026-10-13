import { Reflector } from '@nestjs/core';
import {
  BypassResponseWrapper,
  BYPASS_RESPONSE_WRAPPER_KEY,
} from './bypass-response-wrapper.decorator';

describe('BypassResponseWrapper Decorator', () => {
  it('should attach bypass metadata (true) to a class method', () => {
    class TestController {
      @BypassResponseWrapper()
      testMethod() {}
    }

    const reflector = new Reflector();
    const isBypassed = reflector.get<boolean>(
      BYPASS_RESPONSE_WRAPPER_KEY,
      TestController.prototype.testMethod,
    );
    expect(isBypassed).toBe(true);
  });
});
