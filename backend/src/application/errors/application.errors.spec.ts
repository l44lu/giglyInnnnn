import {
  ApplicationValidationError,
  ApplicationNotFoundError,
  ApplicationAuthorizationError,
} from './application.errors';

describe('Application Errors', () => {
  describe('ApplicationValidationError', () => {
    it('should be an instance of Error and preserve prototype chain', () => {
      const error = new ApplicationValidationError('Validation failed');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApplicationValidationError);
      expect(error.name).toBe('ApplicationValidationError');
      expect(error.message).toBe('Validation failed');
    });
  });

  describe('ApplicationNotFoundError', () => {
    it('should be an instance of Error and preserve prototype chain', () => {
      const error = new ApplicationNotFoundError('Resource not found');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApplicationNotFoundError);
      expect(error.name).toBe('ApplicationNotFoundError');
      expect(error.message).toBe('Resource not found');
    });
  });

  describe('ApplicationAuthorizationError', () => {
    it('should be an instance of Error and preserve prototype chain', () => {
      const error = new ApplicationAuthorizationError('Authorization failed');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApplicationAuthorizationError);
      expect(error.name).toBe('ApplicationAuthorizationError');
      expect(error.message).toBe('Authorization failed');
    });
  });
});
