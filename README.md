# firebase-backend

[![CI](https://github.com/filledstacks/firebase-backend/actions/workflows/main.yml/badge.svg)](https://github.com/filledstacks/firebase-backend/actions/workflows/main.yml)
[![Version](https://img.shields.io/npm/v/firebase-backend.svg)](https://www.npmjs.com/package/firebase-backend)
![Prerequisite](https://img.shields.io/badge/node-%3E%3D10-blue.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> A package that helps with the management and expansion of a maintainable
> firebase backend

- [firebase-backend](#firebase-backend)
  - [Requirements](#requirements)
  - [Overview](#overview)
    - [Types of Functions](#types-of-functions)
    - [Code structure](#code-structure)
  - [Code Setup](#code-setup)
    - [Installation](#installation)
    - [Configuration](#configuration)
    - [Restful Functions (Endpoints)](#restful-functions-endpoints)
    - [Reactive Functions](#reactive-functions)
    - [Environment Setup](#environment-setup)
    - [Deploy](#deploy)
  - [Author](#author)
  - [Contributing](#contributing)
  - [License](#license)

## Requirements

- node >=10

## Overview

Let's to start out by going through a high level overview of how the backend
will be setup. This overview will go over the types of functions we use as well
as the actual code structure.

### Types of Functions

The backend is built around the strengths that firebase poses in their
serverless cloud functions setup. Focussing on those strengths we can break the
system into two types of functions (could also be called a micro-service if you
choose to). Reactive and RESTul

- **Reactive:** This is a function that will run in reaction to data or state
  updating on the backend. An example of this will be when a file is uploaded to
  cloud storage or the most common when a document / entry in the database has
  been updated.
- **RESTful:** This is the function that will run when the user makes an http
  request to the uri the function is assigned to. Nothing special about these
  ones. Just 1 note that's very important. This will not be used for single CRUD
  operations like adding a user, deleting a user, updating a user. And it's
  built with that in mind. This means you won't be able to define a single api
  endpoint for user that behaves differently based on the HTTP verb used. This
  is by design and won't be changed. All CRUD should be performed directly on
  your Firebase DB of choice. That's how this is supposed to be used.

### Code structure

We have an enforced code structure that will help with the organization of the
backend as well as the overall maintenance as it grows. There's 3 major things
to go over.

1. **Each function will be in its own dedicated file:** This is to get rid of
   the "natural" tendency, when starting with firebase cloud functions, to keep
   adding functions into the same index file forcing it to grow bigger as your
   backend requirements grow. _The file name will be the exact name of the
   endpoint to keep things easy to manage. This is not a requirement but I've
   found it to be quite helpful_.
2. Functions will be placed in a folder titled either restful or reactive
3. The backend will be split into different resource groups to ensure a
   structured backend in production

Organize your `firebase functions` folder into api domain folders (`groups`) and function type (`reactive`, `restful`).

```
src
  {group_name_folder}
    reactive
      - onSomeTrigger.function.ts
      - onSomeOtherTrigger.function.ts
    restful
      - someEndpointName.endpoint.ts
      - someOtherEndpointName.endpoint.ts
  - index.ts
package.json
```

## Code Setup

### Installation

We'll start off by installing the package dedicated to using this system
`firebase-backend`. Install the package through npm

```sh
npm install firebase-backend
```

### Configuration

Then you can open the index.ts file in your source folder and update it to

```ts
import { FunctionParser } from 'firebase-backend';

exports = new FunctionParser(__dirname, exports).exports;
```

These are the two magical lines of code that allows us to dynamically add and
export functions as the backend grows without ever changing the index file 🥳.
And that's also all we need to set it up. Now we can start creating functions 😎

#### Add a prefixed deployment

If you want to prefix all the generated cloud functions, for versioning, or for any use case, see the example below. This will add the version v2_ infront of all deployed functions keeping your previously deployed functions in tact.

```ts
import { FunctionParser } from 'firebase-backend';

exports = new FunctionParser(__dirname, exports).exports;

const backendVersion = 'v2';
const seperator = '_';

for (const key in exports) {
  if (Object.prototype.hasOwnProperty.call(exports, key)) {
    exports[`${backendVersion}${seperator}${key}`] = exports[key];
    delete exports[key];
  }
}
```

### Restful Functions (Endpoints)

**Create**

Let's say we wanted to make an endpoint where a client application could add a payment method for a user.

- The API would be called `users`
- The function would be called `addPaymentMethod`
- The file would be called `src/users/restful/addPaymentMethod.endpoint.ts`
- The endpoint name will be exactly the name of your file
- The `endpoint.ts` file extension identifies the function as an HTTP endpoint

```ts
// src/users/restful/addPaymentMethod.endpoint.ts
import { Request, Response } from 'express';
import { Post } from 'firebase-backend'; // Get, Post, Put, Update, Delete available

// Use the `Post` class which is extended from the `Endpoint` class.
export default new Post((request: Request, response: Response) => {
  // Read the values out of the body
  const cardNumber = request.body['card_number'];
  const cardHolder = request.body['card_holder'];

  // Do your thing with the values
  var paymentToken = `${cardNumber}_${cardHolder}`;

  // Send your response. 201 to indicate the creation of a new resource
  return response.status(201).send({
    token: paymentToken,
  });
});
```

**Middleware**
You can now pass an array of middleware you'd want to add to an endpoint:

```ts
// src/users/restful/auth.middleware.ts
import { Request, Response, NextFunction } from 'express'
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => { ... }

// src/users/restful/addPaymentMethod.endpoint.ts
import { Request, Response } from 'express'
import { EndpointMiddleware, Post } from 'firebase-backend'
import { authMiddleware } from './auth.middleware'

export default new Post((req: Request, res: Response) => {}, {
  middlewares: [authMiddleware]
})
```

**Testing**

To test this out we'll run the following command in the functions folder.

```sh
npm run serve
```

This will build the TypeScript code and then serve the functions locally through
the emulator. If this is successful you should see the following in the console.
You should see the functions API has deployed (locally) a function at the
following url

```sh
http://localhost:5001/boxtout-fireship/us-central1/users-api
```

All the endpoints in the users resource group will be deployed under the
`/user-api` function. This means that we can make a post request to the endpoint
with the expected data and check if we get back a result. I'm going to use
[PostMan](https://www.postman.com/) to test this out. So we'll put in the above
url and add `/addpaymentmethod` at the end of it. Select post as the HTTP
request type and then pass in a body.

```json
{
  "card_number": "5418754514815181",
  "card_holder": "FilledStacks"
}
```

When we execute this we get back the token in the format we supplied

```json
{
  "token": "5418754514815181_FilledStacks"
}
```

There we have it, your first endpoint created. Next up is reactive functions.

### Reactive Functions

**Create**

Let's say we wanted to make a function that would run when the firestore db had a user record updated.

- The API would be called `users`
- The function would be called `onUserCreated`
- The file would be called `src/users/reactive/onUserCreated.function.ts`
- The endpoint name will be exactly the name of your file
- The `function.ts` file extension identifies the function as reactive

```ts
// src/users/reactive/onUserCreated.function.ts
import * as functions from 'firebase-functions';

export default functions.firestore
  .document('users/{userId}')
  .onCreate((userSnapshot, context) => {
    const data = userSnapshot.data();
    console.log(`User Created | send an email to ${data.email}`);
  });
```

Run `npm run build` in the functions folder. Then run `firebase emulators:start`.

You should now have a function deployed at `users-onUserCreated` as well as at
`users-api`. All the api endpoints go under the one api function, but the
reactive functions are added as their own functions. Lets test this out.

**Testing**

At the bottom of your logs you'll see a link to firestore
<http://localhost:4000/firestore> . Open that in your browser. You'll see an
empty page. Click on start collection, make the collection id `users` . Add a
field called email and put the value dane@filledstacks.com and save the
document. When this is saved you should see the logs printing out the following
message

```log
i  functions: Beginning execution of "users-onUserCreated"
>  User id created TybqxAwnC4X5DWLgtXOp
>  {"severity":"WARNING","message":"Function returned undefined, expected Promise or value"}
i  functions: Finished "users-onUserCreated" in ~1s
>  User Created | send an email to dane@filledstacks.com
```

And that's it! You've created a reactive function as well as a http endpoint.
Going further when you want to expand you backend you simply create a new file
in the dedicated folder depending on the function type and it'll be added
automatically.

### Environment Setup

The way that the default TypeScript project is setup is not sufficient for
consistent deployments and debugging. Because of that we'll add some additional
things into our project. We'll start by making sure that old function code don't
lurk around when we're testing any new changes. To fix that we'll add a new
package into the functions folder called `rimraf`

```sh
npm install -D rimraf
```

Then we'll add 2 new scripts into the `package.json` . Above the `build` script
we'll add `clean` and `prebuild`.

```json
"scripts": {
    "lint": "eslint --ext .js,.ts .",
    "clean": "rimraf lib/",
    "prebuild": "npm run clean",
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  }
```

This will now clean out your generated code before building the new code.

### Deploy

And finally we can deploy our backend. We first run `npm run build` when that's
complete we run `npm run deploy` and that will push all the latest function code
to your firebase project.

## Author

**FilledStacks <dane@filledstacks.com>**

- Website: <https://www.filledstacks.com>
- GitHub: [@FilledStacks](https://github.com/FilledStacks)

## Contributing

Contributions, issues and feature requests are welcome!

Feel free to check
[issues page](git+https://github.com/filledstacks/firebase-backend/issues).

## License

Copyright © 2021
[FilledStacks <dane@filledstacks.com>](https://github.com/FilledStacks).

This project is [MIT](LICENSE) licensed.
