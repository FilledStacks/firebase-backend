// functionParser.ts

import express, { Application, Router } from 'express';
import * as functions from 'firebase-functions';
import glob from 'glob';
import { parse, ParsedPath } from 'path';
import { Endpoint, RequestType } from './models';

// enable short hand for console.log()
const { log } = console;

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
    groupByFolder: boolean = true,
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
    const functionFiles: string[] = glob.sync(
      `${this.rootPath}/**/*.function.js`,
      {
        cwd: this.rootPath,
        ignore: './node_modules/**',
      },
    );

    functionFiles.forEach((file: string) => {
      const filePath: ParsedPath = parse(file);

      const directories: string[] = filePath.dir.split('/');

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

    const apiFiles: string[] = glob.sync(`${this.rootPath}/**/*.endpoint.js`, {
      cwd: this.rootPath,
      ignore: './node_modules/**',
    });

    const app: Application = express();

    const groupRouters: Map<string, express.Router> = new Map();

    apiFiles.forEach((file: string) => {
      const filePath: ParsedPath = parse(file);

      const directories: Array<string> = filePath.dir.split('/');

      const groupName: string = groupByFolder
        ? directories[directories.length - 2] || ''
        : directories[directories.length - 1] || '';

      let router: Router | undefined = groupRouters.get(groupName);

      if (!router) {
        router = express.Router();

        groupRouters.set(groupName, router);
      }

      try {
        this.buildEndpoint(file, groupName, router);
      } catch (e) {
        throw new Error(
          `Restful Endpoints - Failed to add the endpoint defined in ${file} to the ${groupName} Api.`,
        );
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
    router: express.Router,
  ) {
    const filePath: ParsedPath = parse(file);

    const endpoint: Endpoint = require(file).default as Endpoint;

    const name: string =
      endpoint.name || filePath.name.replace('.endpoint', '');

    const { handler } = endpoint;

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
          `A unsupported RequestType was defined for a Endpoint.\n
          Please make sure that the Endpoint file exports a RequestType
          using the constants in src/system/constants/requests.ts.\n
          **This value is required to add the Endpoint to the API**`,
        );
    }
    log(
      `Restful Endpoints - Added ${groupName}/${endpoint.requestType}:${name}`,
    );
  }
}
