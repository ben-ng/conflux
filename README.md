# Conflux [![Build Status](https://img.shields.io/circleci/project/ben-ng/conflux/master.svg)](https://circleci.com/gh/ben-ng/conflux/tree/master) [![Coverage Status](https://img.shields.io/coveralls/ben-ng/conflux/master.svg)](https://coveralls.io/github/ben-ng/conflux?branch=master) [![npm version](https://img.shields.io/npm/v/conflux.svg)](https://www.npmjs.com/package/conflux)

Conflux is [Redux](https://github.com/rackt/redux) for distributed systems.

Try a [demo](https://conflux-demos.herokuapp.com)!

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Contents**

- [Motivation](#motivation)
- [What Can I Build With Conflux?](#what-can-i-build-with-conflux)
- [Quick Example](#quick-example)
- [API](#api)
  - [Creating an instance](#creating-an-instance)
  - [Performing Methods To Dispatch Actions](#performing-methods-to-dispatch-actions)
  - [Reducing Actions Into State](#reducing-actions-into-state)
  - [Subscribing to changes](#subscribing-to-changes)
  - [Getting Committed and Provisional State](#getting-committed-and-provisional-state)
  - [Deconstructing an instance](#deconstructing-an-instance)
- [Correctness](#correctness)
- [What Could Go Wrong](#what-could-go-wrong)
- [Contributing](#contributing)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Motivation

Distributed systems are **hard**. Conflux is an attempt at making distributed systems understandable. It aims to do what [Redux](http://redux.js.org) did for [Flux](https://facebook.github.io/flux), and what [Raft](http://raft.github.io) did for [Paxos](https://en.wikipedia.org/wiki/Paxos_(computer_science)).

Naturally, it does this by composing the two ideas.

## What Can I Build With Conflux?

You can build serverless applications! I don't mean ["serverless"](https://github.com/serverless/serverless) as in "uses AWS Lambda". I mean serverless as in "there is no central server, just a cluster of nodes that coordinate with each other". Think Bittorent.

Conflux is *very* new, so I am working on a few example applications to demonstrate what's possible. If you build something with Conflux, send me a PR so I can add it to this list.

* [Various In-Browser Demos](https://conflux-demos.herokuapp.com)
* [Distributed Mutex](https://github.com/ben-ng/mutex-js)

## Quick Example

```js
var node = conflux({
  id: uuid.v4()

  // how many nodes are in the cluster?
, clusterSize: 5

  // how should nodes communicate?
, channel: {
    name: 'redis'
  }

  // define your action creators
, methods: {
    append: function (thing) {
      return thing
    }
  }

  // define your reducer
, reduce: function (state, action) {
    state = state == null ? [] : state

    return state.concat(action)
  }
})

// subscribe to changes
node.subscribe(function () {
  console.log(nodeB.getState().log.join(' '))
})

// perform an action
node.perform('append', ['foo'])
```

If you've used Redux before, Conflux should look familiar. You `subscribe()` to a Conflux instance, and call `getState()` inside to get the current state. Instead of dispatching actions directly, you `perform()` Methods that `dispatch()` them. Methods are declared when you construct a Conflux instance, and are the equivalent of Action Creators in Redux.

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
        name: 'redis' // or 'memory', etc

        // ... additional keys are passed as options to the "redis" channel.
        // see Gaggle's Channel docs for available channels and options:
        // https://github.com/ben-ng/gaggle#channels
      }

      // these are "action creators" in redux parlance
    , methods: {
        foobar: function (foo, bar) {
          return {
            type: 'FOOBAR'
          , foo: foo
          , bar: bar
          }
        }
      }

      // this is the reducer function that redux stores are constructed with
    , reduce: function (state, action) {
        // return a new `state` using the information in `action`
      }

      /**
      * Optional, advanced settings. These control the parameters of the
      * underlying Raft algorithm, so you can optimize performance for the
      * network that you are on. You should set them lower on fast networks
      * and higher on slow networks.
      */

      // The range of random values that will be selected for the
      // Raft leader election timeout, in milliseconds
    , electionTimeout: {
        min: 300
      , max: 500
      }

      // The interval in milliseconds where the leader node will
      // send heartbeats to followers. Must be significantly shorter
      // than the electionTimeout. Should be longer than the average
      // round-trip message time.
    , heartbeatInterval: 50
    })
```

Conflux is built on top of [Gaggle](https://github.com/ben-ng/gaggle), and therefore supports [any communication channel that Gaggle supports](https://github.com/ben-ng/gaggle#channels).

### Performing Methods To Dispatch Actions

```txt
c.perform(String methodName, Array args, [Number timeout], [Function callback])
```

You never dispatch Actions directly in Conflux. Actions must be dispatched from the body of a Method. **Methods must be synchronous.** You declare Methods when constructing a Conflux instance, and call them with `perform()`. These Methods return the Action to be dispatched, `null` if nothing should be done, and an Error if the Action is invalid for the provisional state.

```js
var opts = {
  methods: {
    foobar: function (foo, bar) {
      // The perform callback will be called with no error and this return
      // value as the second argument
      return {
        type: 'FOOBAR'
      , foo: foo
      , bar: bar
      }
    }
  , bonk: function () {
      return new Error('Whoops')
    }
  , noop: function () {
      // The perform callback will be called with no error or response
      return null
    }
  }

  // ... other Conflux options, like the channel to use, node id, etc...
}

var c = conflux(opts)

// Callback API
c.perform('noop', [], function (err) {
  console.log(err) // => null
})

c.perform('noop', [], 5000, function (err) {
  console.log(err) // => null
})

// Promise API
c.perform('foobar', ['a', 'b'])
.then(function (action) {
  console.log(action) // => {type: 'FOOBAR', foo: 'a', bar: 'b'}
})

c.perform('bonk', [], 5000)
.catch(function (err) {
  console.log(err) // => Error: Whoops
})
```

### Reducing Actions Into State

```js
// A starter template for your own reducer
function (state, action) {
  // Set initial state or clone existing state
  if (state == null) {
    state = {}
  }
  else {
    state = JSON.parse(JSON.stringify(state))
  }

  // Ignore unknown actions
  if (action == null) {
    return state
  }

  // Handle known actions
  switch (action.type) {
    case 'FOO':
      state.isFoo = true
    break
    case 'BAR':
      state.isBar = true
    break
  }

  // Return the new state
  return state
}
```

Reducers should obey a few rules:

1. Do not mutate `state`
2. Always return a new `state`
3. Be prepared to set an inital state if `state` is `undefined`
4. If the action is unrecognized (it might be `null` when `Conflux` initializes the state, for example), return the same `state`

### Subscribing to changes

```txt
c.subscribe(function() callback)
```

Calls `callback` whenever an action is committed. Returns an `unsubscribe` function that when called, removes `callback` from the subscriptions.

### Getting Committed and Provisional State

```txt
c.getState()
c.getProvisionalState()
```

Unlike `Redux`, `Conflux` has two types of state: *committed* state, and *provisional* state.

`getState()` gets you the *committed* state of the node. All nodes are guaranteed to enter this state at some point, but it does not contain the effects of uncommitted Actions.

`getProvisionalState()` gets you the state of the node *if all currently uncommitted actions are committed*. Since the leader might fail before these Actions are committed, *it is possible that no nodes ever actually enter this state*.

You should use the provisional state in your Methods to determine the validity of an Action. The committed state should be used just about everywhere else, like in your `subscribe()` callback.

### Deconstructing an instance

```txt
c.close([function(Error) callback])
```

When you're done, call `close` to remove event listeners and disconnect the channel.

```js
c.close(function (err) {})

c.close().then()
```

## Correctness

Distributed systems are really difficult to prove and test, and Conflux is no exception. I am still working on formal proofs, but in the meantime here is an incomplete list of things that are being done in the name of correctness.

* Conflux has integration tests with [full statement *and* branch coverage](https://coveralls.io/github/ben-ng/conflux?branch=master)
* It is built on Gaggle, which has integration tests with [full statement coverage](https://coveralls.io/github/ben-ng/gaggle?branch=master)
* My [distributed mutex](https://github.com/ben-ng/mutex-js) is built on Conflux and has [full statement *and* branch coverage](https://coveralls.io/github/ben-ng/mutex-js?branch=master) and a [fuzz test](https://github.com/ben-ng/mutex-js/tree/master/fuzz) you can run yourself

## What Could Go Wrong

In the name of [good science](http://calteches.library.caltech.edu/51/2/CargoCult.htm), and as a first line of defense against bandwagons & go fever, here are all the real and possible issues I can think of that you might run into by using this software.

1. Since Gaggle doesn't do log compaction yet, it will take Conflux longer and longer to catch up a node that fails and then restarts with an empty log
2. Since Gaggle can't handle membership changes yet, you cannot change the size of the cluster during operation, and there is no safety check against this, so you will experience undefined behavior if you change the number of nodes in the cluster
3. Conflux can't handle byzantine failures, so **you should only use it in envrionments you control, or where security is not an issue** (a cute demo, for example)
4. I *think* that Conflux will tolerate crash-stop failures since it is based on Raft, but haven't proved or tested this at all
5. I haven't formally proved that any of my ideas are correct yet, and even after I do, you should wait a while for more experienced people to weigh in and check my work
6. It is **really difficult** to reproduce issues in distributed systems, so if you run into a problem, you're most likely on your own
7. The documentation is sparse because I released early to get feedback, and I'm still trying to figure out what the best way to teach Conflux is, so it might be tricky getting started.

TLDR: You should not use Conflux for mission-critical work.

## Contributing

Make some [cool demos](https://github.com/ben-ng/conflux-demos). Help me refine the idea, docs, and API. Send me pull requests, even if its for a tiny typo. Chat with me on [twitter](https://twitter.com/_benng).

Let's make distributed systems fun.

## License

Copyright (c) 2016 Ben Ng <me@benng.me>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
