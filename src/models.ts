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
  name: string;
  handler: Function;
  requestType: RequestType;

  /**
   * Creates an instance of Endpoint.
   *
   * @param {string} name
   * @param {RequestType} requestType
   * @param {IExpressHandler} handler
   * @memberof Endpoint
   */
  constructor(
    name: string,
    requestType: RequestType,
    handler: IExpressHandler
  ) {
    if (!name || name.length < 1) {
      throw 'Please provide the endpoint name. Endpoint name cannot be blank.';
    }
    if (!handler) {
      throw 'Please provide a endpoint request handler.';
    }
    this.name = name;
    this.handler = handler;
    this.requestType = requestType;
  }
}
