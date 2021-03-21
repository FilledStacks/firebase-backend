import bodyParser from 'body-parser';
import express from 'express';
import * as functions from 'firebase-functions';
import glob from 'glob';
import { parse } from 'path';
import { Endpoint, RequestType } from './models';

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
    console.log('FunctionParser - Building reactive cloud functions ... ');

    // Get all the files that has .function in the file name
    const functionFiles: any = glob.sync(`${this.rootPath}/**/*.function.js`, {
      cwd: this.rootPath,
      ignore: './node_modules/**',
    });

    for (let i = 0, fl = functionFiles.length; i < fl; i++) {
      const file: any = functionFiles[i];

      const filePath: any = parse(file);

      const directories: any = filePath.dir.split('/');

      let groupName: string = directories.pop() || '';

      // Get second last folder name
      if (groupByFolder) {
        groupName = directories.pop() || '';
      }

      const functionName: any = file.split('/')[3].slice(0, -12); // Strip off '.function.js'

      if (
        !process.env.FUNCTION_NAME ||
        process.env.FUNCTION_NAME === functionName
      ) {
        if (!this.exports[groupName]) {
          // This creates exports['orders']
          this.exports[groupName] = {};
        }

        console.log(
          `FunctionParser - Add reactive function ${functionName} to group ${groupName}`
        );

        this.exports[groupName] = {
          ...this.exports[groupName],
          ...require(file),
        };
      }
    }
    console.log('FunctionParser - Reactive functions built successfully');
  }

  /**
   * Looks at all .endpoint.js files and adds them to the group they belong in
   *
   * @private
   * @param {boolean} groupByFolder
   * @memberof FunctionParser
   */
  private buildRestfulApi(groupByFolder: boolean) {
    console.log('FunctionParser - Building API endpoints... ');

    const apiFiles: any = glob.sync(`${this.rootPath}/**/*.endpoint.js`, {
      cwd: this.rootPath,
      ignore: './node_modules/**',
    });

    const app: any = express();

    const groupRouters: Map<string, express.Router> = new Map();

    for (let f = 0, fl = apiFiles.length; f < fl; f++) {
      const file: any = apiFiles[f];

      const filePath: any = parse(file);

      const directories: any = filePath.dir.split('/');

      let groupName: string = directories.pop() || '';

      // Get second last folder name
      if (groupByFolder) {
        groupName = directories.pop() || '';
      }

      let router: any = groupRouters.get(groupName);

      if (!router) {
        router = express.Router();
        groupRouters.set(groupName, router);
      }

      try {
        this.buildEndpoint(file, router);
      } catch (e) {
        console.log(
          `Failed to add the endpoint defined in ${file} to the ${groupName} Api. `,
          e
        );
        throw new Error(
          `Failed to add the endpoint defined in ${file} to the ${groupName} Api.`
        );
      }

      app.use('/', router);
      // bodyParser is deprecated
      app.use(bodyParser.json());
      // bodyParser is deprecated
      app.use(
        bodyParser.urlencoded({
          extended: false,
        })
      );

      this.exports[groupName] = {
        ...this.exports[groupName],
        api: functions.https.onRequest(app),
      };
    }
    console.log('FunctionParser - Reactive functions built successfully...');
  }

  /**
   * Parses a .endpoint.js file and sets the endpoint path on the provided router
   *
   * @private
   * @param {string} file
   * @param {express.Router} router
   * @memberof FunctionParser
   */
  private buildEndpoint(file: string, router: express.Router) {
    console.log(`buildEndpoint: ${file}`);

    var endpoint: any = require(file).default as Endpoint;

    const name: any = endpoint.name;

    var handler: any = endpoint.handler;

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
    console.log(
      `Added functionName: ${name} as ${endpoint.requestType} endpoint.`
    );
  }
}
