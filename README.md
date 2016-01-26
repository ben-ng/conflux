# Conflux [![Build Status](https://img.shields.io/circleci/project/ben-ng/conflux/master.svg)](https://circleci.com/gh/ben-ng/conflux/tree/master) [![Coverage Status](https://img.shields.io/coveralls/ben-ng/conflux/master.svg)](https://coveralls.io/github/ben-ng/conflux?branch=master) [![npm version](https://img.shields.io/npm/v/conflux.svg)](https://www.npmjs.com/package/conflux)

Conflux is [Redux](https://github.com/rackt/redux) for distributed systems.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Contents**

- [Motivation](#motivation)
- [Example](#example)
- [API](#api)
  - [Creating an instance](#creating-an-instance)
  - [Performing Methods](#performing-methods)
  - [Dispatching Actions](#dispatching-actions)
  - [Subscribing to changes](#subscribing-to-changes)
  - [Deconstructing an instance](#deconstructing-an-instance)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Motivation

Conflux helps you build understandable distributed applications. Its trying to do what [Redux](http://redux.js.org) did for [Flux](https://facebook.github.io/flux), and what [Raft](http://raft.github.io) did for [Paxos](https://en.wikipedia.org/wiki/Paxos_(computer_science)).

## Example

```js
// Your action creators, reducer, and other settings go in `opts`
// See the full docs for that; I want to keep this example short.
var nodeA = conflux(opts)
var nodeB = conflux(opts)
var nodeC = conflux(opts)

// When the cluster comes to consensus about an action, this
// method is called.
nodeB.subscribe(function () {
  console.log(nodeB.getState().log.join(' '))
})

// Performs an RPC call on the leader node, causing actions
// to be dispatched on the entire cluster.
nodeA.perform('append', ['foo'])

nodeB.dispatch('append', ['bar'])

nodeC.perform('append', ['baz'])

// Output will be some permutation of:
//
// bar
// bar foo
// bar foo baz
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
        // You can use any Gaggle Channel, like Redis.
      }

      // these take the place of "action creators" in redux parlance
    , methods: {
        foobar: function (foo, bar, cb) {
          this.dispatch(action, cb)
        }
      }

      // this is the reducer function that redux stores are constructed with
    , reduce: function (state, action) {
        // return a new `state` using the information in `action`
      }

      // ... additional Gaggle options, see Gaggle's documentation
    })
```

Conflux is built on top of [Gaggle](https://github.com/ben-ng/gaggle), and therefore supports [any communication channel that Gaggle supports](https://github.com/ben-ng/gaggle#channels).

### Performing Methods

```txt
c.perform(String methodName, Array args, [Number timeout], [function(Error) callback])
```

You never dispatch Actions directly in Conflux. Actions must be dispatched from the body of a Method. You declare Methods when constructing a Conflux instance, and call them with `perform()`.

### Dispatching Actions

```txt
c.dispatch(Mixed action, Number timeout, function(Error) callback)
```

Anything that can be serialized and deserialized as JSON is a valid Action, but you probably want to use an object. You should only ever call `dispatch` from a Method, and you should provide both a timeout and a callback function.

```js
g.dispatch({
  type: 'MY_ACTION_NAME'
, foo: 'bar'
, dee: 'dum'
}, function (err) {

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
