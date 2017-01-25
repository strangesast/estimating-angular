export class ValidationError extends Error {
  constructor(public message: string) {
    super(message);
    this.name = 'ValidationError';
    this.message = message;
    this.stack = (<any>new Error()).stack;
  }
  toString() {
    return this.name + ': ' + this.message;
  }
}

export class NotImplementedError  extends Error {
  constructor(public message: string) {
    super(message);
    this.name = 'NotImplementedError';
    this.message = message;
    this.stack = (<any>new Error()).stack;
  }
  toString() {
    return this.name + ': ' + this.message;
  }
}
