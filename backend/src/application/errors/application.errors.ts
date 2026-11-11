export class ApplicationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplicationValidationError';
    Object.setPrototypeOf(this, ApplicationValidationError.prototype);
  }
}

export class ApplicationNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplicationNotFoundError';
    Object.setPrototypeOf(this, ApplicationNotFoundError.prototype);
  }
}

export class ApplicationAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplicationAuthorizationError';
    Object.setPrototypeOf(this, ApplicationAuthorizationError.prototype);
  }
}

export class ApplicationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplicationConflictError';
    Object.setPrototypeOf(this, ApplicationConflictError.prototype);
  }
}
