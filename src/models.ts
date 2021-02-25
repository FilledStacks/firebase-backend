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

export interface IEndpoint {
  name: string;
  handler: Function;
  requestType: RequestType;
}
