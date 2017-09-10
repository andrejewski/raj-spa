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

import router, {Route} from './router'
import homepage from './pages/home'

function getRouteProgram (route) {
  // NOTE: I use tagmeme here cuz I like it best
  return Route.match(route, [
    // Static program routing
    Route.Home, () => homepage,

    // Dynamic, code-split routing (using ES6 import())
    // i.e. you can return a promise which resolves a program
    Route.User, userId =>
      System.import('./pages/user').then(page => page.default(userId)),

    // 404
    () => System.import('./pages/not-found')
  ])
}

const initialProgram = {
  init: [],
  update () { return [] },
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
| `getRouteProgram` | `route => RajProgram` | The mapping from routes to programs which receives a route and returns a `RajProgram` or a Promise that resolves as `RajProgram`.
| `initialProgram` | `RajProgram` | The initial program used before the first received route from the router resolves. The transition to the first route's program should be instantaneous if a static program returns from `getRouteProgram`.

#### Optional configuration

| Property | Type | Description |
| -------- | ---- | ----------- |
| `errorProgram` | `Error => RajProgram` | The program to use when a program rejects with an error. `errorProgram` receives the error and returns a `RajProgram`.
| `viewContainer` | function | A container view which wraps the entire application. The function will receive a `ViewContainerModel` and the sub program's `view` result to encapsulate.

#### Types

##### `RajProgram`
This is a normal Raj configuration.

```
interface RajProgram {
  init: [model, effect];
  update: function(msg, state);
  view: function(state, dispatch);
}
```

##### `RajRouter`
Raj SPA will work with any router that is compatible with the following interface. Note that Raj Spa makes no assumption about the underlying navigation rules. Choices, such as push-state or hash-state, are all encapsulated by the router.

```
interface RajRouter {
  subscribe: function(routeMsg, cancelMsg);
}
```

The `routeMsg` is a function which wraps the `route` which goes to `getRouteProgram(route)`. The `cancelMsg` is a function which wraps the `cancellation` function which is a function. When the `cancellation` function calls, route changes should stop dispatching.

Note: this `subscribe` method is an effect so it will receive `dispatch` which it will call with `dispatch(routeMsg(route))` and `dispatch(cancelMsg(cancel))` at the appropriate times.

Note: `route` can be anything that your `getRouteProgram` understands.

##### `ViewContainerModel`
The `viewContainer` function receives this object.

```
interface ViewContainerModel {
  isTransitioning: boolean;
}
```

### Questions

#### Does this work with React Native?
Yes, Raj SPA is unaware of any particular URL-based routing. You can define a "headless" router that emits routes you pick.

#### Server-side rendering?
If you are using React, the `raj-react` bindings return a React Component that works with [`ReactDOMServer`](https://facebook.github.io/react/docs/react-dom-server.html) to get started.

More advanced/experimental strategies exist to increase performance and content delivery, but I won't give advice until I try them out myself.

#### Are there any routers I can steal?
Here's a simple hash-change router implementation.

```js
export default {
  subscribe (routeMsg, cancelMsg) {
    return function (dispatch) {
      function emitHash () {
        dispatch(routeMsg(window.location.hash))
      }

      window.addEventListener('hashchange', emitHash)

      function cancel () {
        window.removeEventListener('hashchange', emitHash)
      }

      dispatch(cancelMsg(cancel))
      emitHash()
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
