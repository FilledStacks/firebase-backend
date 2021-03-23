import express from 'express';
import * as functions from 'firebase-functions';
import glob from 'glob';
import { parse } from 'path';
import { Endpoint, RequestType } from './models';

const log = (message: string) => console.log(`FunctionParser: ${message}`);

/**
 * This class helps with setting sup the exports for the cloud functions deployment.
 *
 * It takes in exports and then adds the required groups and their functions to it for deployment
 * to the cloud functions server.
 *
 * @export
 * @class FunctionParser
 */
export class FunctionParser {
  rootPath: string;
  exports: any;

  /**
   * Creates an instance of FunctionParser.
   *
   * @param {string} rootPath
   * @param {*} exports
   * @param {boolean} [buildReactive=true]
   * @param {boolean} [buildEndpoints=true]
   * @param {boolean} [groupByFolder=true]
   * @memberof FunctionParser
   */
  constructor(
    rootPath: string,
    exports: any,
    buildReactive: boolean = true,
    buildEndpoints: boolean = true,
    groupByFolder: boolean = true
  ) {
    if (!rootPath) {
      throw new Error('rootPath is required to find the functions.');
    }

    this.rootPath = rootPath;
    this.exports = exports;

    if (buildReactive) {
      this.buildReactiveFunctions(groupByFolder);
    }

    if (buildEndpoints) {
      this.buildRestfulApi(groupByFolder);
    }
  }

  /**
   * Looks for all files with .function.js and exports them on the group they belong to
   *
   * @private
   * @param {boolean} groupByFolder
   * @memberof FunctionParser
   */
  private buildReactiveFunctions(groupByFolder: boolean) {
    log('Reactive Functions - Building...');
    // Get all the files that has .function in the file name
    const functionFiles: any = glob.sync(`${this.rootPath}/**/*.function.js`, {
      cwd: this.rootPath,
      ignore: './node_modules/**',
    });

    functionFiles.forEach((file) => {
      const filePath = parse(file);
      const directories = filePath.dir.split('/');
      const groupName: string = groupByFolder
        ? directories[directories.length - 2] || ''
        : directories[directories.length - 1] || '';
      const functionName = filePath.name.replace('.function', '');

      if (
        !process.env.FUNCTION_NAME ||
        process.env.FUNCTION_NAME === functionName
      ) {
        if (!this.exports[groupName]) this.exports[groupName] = {};
        log(`Reactive Functions - Added ${groupName}/${functionName}`);

        this.exports[groupName] = {
          ...this.exports[groupName],
          ...require(file),
        };
      }
    });

    log('Reactive Functions - Built');
  }

  /**
   * Looks at all .endpoint.js files and adds them to the group they belong in
   *
   * @private
   * @param {boolean} groupByFolder
   * @memberof FunctionParser
   */
  private buildRestfulApi(groupByFolder: boolean) {
    log('Restful Endpoints - Building...');
    /** @type {*} */
    const apiFiles = glob.sync(`${this.rootPath}/**/*.endpoint.js`, {
      cwd: this.rootPath,
      ignore: './node_modules/**',
    });

    const app: any = express();

    const groupRouters: Map<string, express.Router> = new Map();

    apiFiles.forEach((file) => {
      const filePath = parse(file);
      const directories = filePath.dir.split('/');
      const groupName: string = groupByFolder
        ? directories[directories.length - 2] || ''
        : directories[directories.length - 1] || '';

      let router: any = groupRouters.get(groupName);

      if (!router) {
        router = express.Router();
        groupRouters.set(groupName, router);
      }

      try {
        this.buildEndpoint(file, groupName, router);
      } catch (e) {
        const message = `Restful Endpoints - Failed to add the endpoint defined in ${file} to the ${groupName} Api.`;
        log(message);
        throw new Error(message);
      }

      app.use('/', router);

      this.exports[groupName] = {
        ...this.exports[groupName],
        api: functions.https.onRequest(app),
      };
    });

    log('Restful Endpoints - Built');
  }

  /**
   * Parses a .endpoint.js file and sets the endpoint path on the provided router
   *
   * @private
   * @param {string} file
   * @param {express.Router} router
   * @memberof FunctionParser
   */

  private buildEndpoint(
    file: string,
    groupName: string,
    router: express.Router
  ) {
    const filePath = parse(file);

    /** @type {*} */
    var endpoint = require(file).default as Endpoint;
    /** @type {*} */
    const name = endpoint.name || filePath.name.replace('.endpoint', '');
    /** @type {*} */
    var handler = endpoint.handler;

    switch (endpoint.requestType) {
      case RequestType.GET:
        router.get(`/${name}`, handler);
        break;
      case RequestType.POST:
        router.post(`/${name}`, handler);
        break;
      case RequestType.PUT:
        router.put(`/${name}`, handler);
        break;
      case RequestType.DELETE:
        router.delete(`/${name}`, handler);
        break;
      case RequestType.PATCH:
        router.patch(`/${name}`, handler);
        break;
      default:
        throw new Error(
          `Unsupported requestType defined for endpoint. 
          Please make sure that the endpoint file exports a RequestType
          using the constants in src/system/constants/requests.ts.
          We need this value to automatically add the endpoint to the api.`
        );
    }
    log(
      `Restful Endpoints - Added ${groupName}/${endpoint.requestType}:${name}`
    );
  }
}
