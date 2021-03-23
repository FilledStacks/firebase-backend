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
  constructor(
    /**
     * @deprecated "name" parameter is no longer needed
     */
    public name: string | undefined,
    public requestType: RequestType,
    public handler: IExpressHandler
  ) {
    if (!handler) {
      throw 'Please provide a endpoint request handler.';
    }
  }
}

export class Get extends Endpoint {
  constructor(handler: IExpressHandler) {
    super(undefined, RequestType.GET, handler);
  }
}
export class Post extends Endpoint {
  constructor(handler: IExpressHandler) {
    super(undefined, RequestType.POST, handler);
  }
}
export class Put extends Endpoint {
  constructor(handler: IExpressHandler) {
    super(undefined, RequestType.PUT, handler);
  }
}
export class Delete extends Endpoint {
  constructor(handler: IExpressHandler) {
    super(undefined, RequestType.DELETE, handler);
  }
}
export class Patch extends Endpoint {
  constructor(handler: IExpressHandler) {
    super(undefined, RequestType.PATCH, handler);
  }
}
