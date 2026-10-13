import { Reflector } from '@nestjs/core';
import {
  ResponseMessage,
  RESPONSE_MESSAGE_KEY,
} from './response-message.decorator';

describe('ResponseMessage Decorator', () => {
  it('should attach custom message metadata to a class method', () => {
    class TestController {
      @ResponseMessage('Logged out successfully')
      testMethod() {}
    }

    const reflector = new Reflector();
    const message = reflector.get<string>(
      RESPONSE_MESSAGE_KEY,
      TestController.prototype.testMethod,
    );
    expect(message).toBe('Logged out successfully');
  });
});
