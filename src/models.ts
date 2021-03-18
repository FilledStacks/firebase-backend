export enum RequestType {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export interface IExpressHandler {
  (req: any, res: any): any;
}

/**
 * Stores the information to be used when creating a restful endpoint on the backend
 */
export class Endpoint {
  handler: IExpressHandler;
  requestType: RequestType;

  constructor(requestType: RequestType, handler: IExpressHandler) {
    if (!handler) {
      throw 'Please provide a endpoint request handler.';
    }
    this.handler = handler;
    this.requestType = requestType;
  }
}

export class Get extends Endpoint {
  constructor(handler: IExpressHandler) {
    super(RequestType.GET, handler);
  }
}
export class Post extends Endpoint {
  constructor(handler: IExpressHandler) {
    super(RequestType.POST, handler);
  }
}
export class Put extends Endpoint {
  constructor(handler: IExpressHandler) {
    super(RequestType.PUT, handler);
  }
}
export class Delete extends Endpoint {
  constructor(handler: IExpressHandler) {
    super(RequestType.DELETE, handler);
  }
}
export class Patch extends Endpoint {
  constructor(handler: IExpressHandler) {
    super(RequestType.PATCH, handler);
  }
}
