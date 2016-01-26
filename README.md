# Conflux [![Build Status](https://img.shields.io/circleci/project/ben-ng/conflux/master.svg)](https://circleci.com/gh/ben-ng/conflux/tree/master) [![Coverage Status](https://img.shields.io/coveralls/ben-ng/conflux/master.svg)](https://coveralls.io/github/ben-ng/conflux?branch=master) [![npm version](https://img.shields.io/npm/v/conflux.svg)](https://www.npmjs.com/package/conflux)

Conflux is [Redux](https://github.com/rackt/redux) for distributed systems.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Contents**

- [Quick Example](#quick-example)
- [API](#api)
  - [Creating an instance](#creating-an-instance)
  - [Dispatching Actions](#dispatching-actions)
  - [Deconstructing an instance](#deconstructing-an-instance)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Quick Example

```js
var redux = require('gaggle')
var uuid = require('uuid')
var defaults = require('lodash/defaults')
var opts = {
      channel: {
        name: 'redis'
      , redisChannel: 'foo'
      }
    , clusterSize: 3
    , methods: {
        foobar: function (foo, bar, cb) {
          this.dispatch({
            type: 'append'
          , foo: foo
          , bar: bar
          }, cb)
        }
      }
    , reduce: function (state, action) {
        // Either set up initial state, or deep clone old state
        if (state == null)
          state = {log: []}
        else
          state = JSON.parse(JSON.stringify(state))


        switch (action.type) {
          case 'append':
            state.log.push(action.data)
            return state

          // More actions go here
          default:
            return state
        }
      }
    }

var nodeA = conflux(defaults({id: uuid.v4()}, opts))
var nodeB = conflux(defaults({id: uuid.v4()}, opts))
var nodeC = conflux(defaults({id: uuid.v4()}, opts))

nodeB.subscribe(function () {
  console.log(nodeB.getState().log.join(' '))
})

nodeA.dispatch({
  type: 'append'
, data: 'foo'
})

nodeB.dispatch({
  type: 'append'
, data: 'bar'
})

nodeC.dispatch({
  type: 'append'
, data: 'baz'
})

// Output will be something like:
//
// bar
// bar foo
// bar foo baz
//
// NOTE: While all nodes will have the same final
// state, actions may be applied in ANY order!
```

## API

### Creating an instance

```js
var conflux = require('conflux')
    // uuids are recommended, but you can use any string id
  , uuid = require('uuid')
  , c = conflux({
      /**
      * Required settings
      */

      id: uuid.v4()
    , clusterSize: 5
    , channel: {
        name: 'foobar'
        // ... additional Channel options specific to "foobar"
        // see note about channels below
      }

      // these take the place of "action creators" in redux parlance
    , actions: {
        // actions should return either an error or an action
        foobar: function (arg_a, arg_b) {
          // "this" in here refers to the leader conflux instance

          // distributed systems are tricky. make sure that the action
          // can be applied to the current state before dispatching it.
          // isValidForFoobar is left to you to implement
          if (isValidForFoobar(this.getState())) {
            return {
              type: 'FOOBAR'
            , a: arg_a
            , b: arg_b
            }
          }
          else {
            return new Error('Foobar is invalid for the current state')
          }
        }
      }

      // this is the reducer function that redux stores are constructed with
    , reduce: function (state, action) {
        if (action.type === 'FOOBAR') {
          // return a new `state` using the information in `action`
        }
      }

      // ... additional Gaggle options, see Gaggle's documentation
    })
```

Conflux is built on top of [Gaggle](https://github.com/ben-ng/gaggle), and therefore supports [any communication channel that Gaggle supports](https://github.com/ben-ng/gaggle#channels).

### Dispatching Actions

```txt
c.dispatch(Mixed action)
```

Anything that can be serialized and deserialized as JSON is a valid `action`, but you probably want to use an object.

```js
g.dispatch({
  type: 'MY_ACTION_NAME'
, foo: 'bar'
, dee: 'dum'
})
```

### Subscribing to changes

```txt
c.subscribe(function() callback)
```

Calls `callback` whenever an action is committed. Returns the `unsubscribe` function for `callback.

### Deconstructing an instance

```txt
g.close([function(Error) callback])
```

When you're done, call `close` to remove event listeners and disconnect the channel.

```js
g.close(function (err) {})

g.close().then()
```

## License

Copyright (c) 2016 Ben Ng <me@benng.me>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
