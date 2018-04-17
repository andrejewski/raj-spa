# Raj SPA
> Single Page Apps for [Raj](https://github.com/andrejewski/raj)

```sh
npm install raj-spa
```

[![npm](https://img.shields.io/npm/v/raj-spa.svg)](https://www.npmjs.com/package/raj-spa)
[![Build Status](https://travis-ci.org/andrejewski/raj-spa.svg?branch=master)](https://travis-ci.org/andrejewski/raj-spa)
[![Greenkeeper badge](https://badges.greenkeeper.io/andrejewski/raj-spa.svg)](https://greenkeeper.io/)

## Usage

```js
import spa from 'raj-spa'
import {program} from 'raj-react'
import React from 'react'

import router from './router'
import homepage from './pages/home'

function getRouteProgram (route) {
  if (route === '/') {
    // Static program routing
    return homepage
  }

  if (route.startsWith('/users/')) {
    // Dynamic, code-split routing (using ES6 import())
    // i.e. you can return a promise which resolves a program
    const userId = route.split('/').pop()
    return System.import('./pages/user.js').then(page => page.default(userId))
  }

  // 404
  return System.import('./pages/not-found.js')
}

const initialProgram = {
  init: [],
  update: () => [],
  view () {
    return <p>Loading application...</p>
  }
}

export default program(React.Component, () => spa({
  router,
  getRouteProgram,
  initialProgram
}))
```

## Documentation

The `raj-spa` package exports a single function which takes the following arguments and returns a `RajProgram` configuration which can plug into `raj-react` or another Raj program.

#### Required configuration

| Property | Type | Description |
| -------- | ---- | ----------- |
| `router` | `RajRouter` | The router to which the SPA will subscribe.
| `getRouteProgram` | `route => RajProgram` | The mapping from routes to programs which receives a route and returns a `RajProgram` or a Promise that resolves a `RajProgram`.
| `initialProgram` | `RajProgram` | The initial program used before the first received route from the router resolves. The transition to the first route's program should be instantaneous if a static program returns from `getRouteProgram`.

#### Optional configuration

| Property | Type | Description |
| -------- | ---- | ----------- |
| `errorProgram` | `Error => RajProgram` | The program used when loading a program rejects with an error. `errorProgram` receives the error and returns a `RajProgram`.
| `viewContainer` | function | A container view which wraps the entire application. The function will receive a `ViewContainerModel` and the sub program's `view` result to encapsulate.

#### Types

##### `RajProgram`
This is a normal Raj program.

```ts
interface RajProgram {
  init: [model, effect];
  update: function(msg, state);
  view: function(state, dispatch);
}
```

##### `RajRouter`
Raj SPA will work with any router that is compatible with the following interface. Note that Raj Spa makes no assumption about the underlying navigation rules. Choices, such as push-state or hash-state, are all encapsulated by the router.

```ts
interface RajRouter {
  subscribe (): {
    effect: (dispatch: (message: any) => void) => void,
    cancel: () => void
  };
}
```

The `effect` method is an effect so it will receive `dispatch` which it will call with `dispatch(route)` at the appropriate times.

The `cancel` method cancels the subscription to route changes. When the `cancel` function calls, route changes should stop dispatching.

Note: `route` can be anything that your `getRouteProgram` understands.

##### `ViewContainerModel`
The `viewContainer` function receives this object.

```ts
interface ViewContainerModel {
  isTransitioning: boolean;
}
```

### Self-managed programs and nested SPAs
By default, every URL change will trigger a `getRouteProgram()`.
This means the current program will be torn down and the next program set up.
For a minor change like in query params, this can be expensive, lose useful state, and thrash the view.
Programs that can resolve these route changes can be thought of as *self-managed programs*.
If the program is the same between `getRouteProgram` calls, we pass down a `RajRouter` to the program. The program can subscribe to routes emitted from this router.

```js
function getRouteProgram (route, { selfManaged }) {
  if (route === '/simple-page') {
    return simpleProgram
  }
  if (route.startsWith('/nested-spa')) {
    return selfManaged(
      'my-nested-spa',
      router => nestedSpa(router)
    )
  }
}
```

The `selfManaged` function takes an arbitrary value which is used for program equality and the function which will be called to set up the program.
That function receives a subscription which it can watch for route changes.

### Questions

#### Does this work with React Native?
Yes, Raj SPA is unaware of any particular URL-based routing. You can define a "headless" router that emits routes you pick.

#### Server-side rendering?
If you are using React, the `raj-react` bindings return a React Component that works with [`ReactDOMServer`](https://facebook.github.io/react/docs/react-dom-server.html) to get started.

More advanced/experimental strategies exist to increase performance and content delivery, but I won't give advice until I try them out myself.

#### Are there any routers I can steal?
Here is a hash-change router implementation.

```js
export default {
  subscribe () {
    let listener
    return {
      effect (dispatch) {
        listener = () => dispatch(window.location.hash)
        window.addEventListener('hashchange', listener)
        listener() // dispatch initial route
      },
      cancel () {
        window.removeEventListener('hashchange', listener)
      }
    }
  }
}
```

I recommend using something on top of this like [`tagmeme`](https://github.com/andrejewski/tagmeme) to define and then pattern match on different pages.

#### My pages have the same header/footer...?
Use `containerView` to describe all the universal parts of your app.

```js
export function containerView (viewContainerModel, subView) {
  return <div>
    <header>...</header>
    <main>{subView}</main>
    <footer>...</footer>
  </div>
}
```

Or, you can nest the SPA component in a surrounding program/component.
