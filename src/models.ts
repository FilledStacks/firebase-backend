// models.ts

/**
 * @export
 * @enum {number}
 */
export enum RequestType {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

/**
 * @export
 * @interface IExpressHandler
 */
export interface IExpressHandler {
  (req: any, res: any): any;
}

/**
 * Stores the information to be used when creating a restful endpoint on the backend
 *
 * @export
 * @class Endpoint
 */
export class Endpoint {
  /**
   * Creates an instance of Endpoint.
   *
   * @param {string} name
   * @param {RequestType} requestType
   * @param {IExpressHandler} handler
   * @memberof Endpoint
   */
  constructor(
    /**
     * @deprecated "name" parameter is no longer needed
     */
    public name: string | undefined,
    public requestType: RequestType,
    public handler: IExpressHandler,
  ) {
    if (!handler) {
      throw new Error('Please provide a endpoint request handler.');
    }

    this.name = name;
    this.handler = handler;
    this.requestType = requestType;
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
