var gaggle = require('gaggle')
  , _ = require('lodash')
  , Promise = require('bluebird')
  , Conflux
  , ACTION_TYPE = 'ACTION'
  , NOOP_TYPE = 'NOOP'

Conflux = function Conflux (opts) {

  var self = this
    , gOpts = _.assign(_.omit(opts, 'reduce', 'methods'), {
                accelerateHeartbeats: true
              , rpc: {
                  performMethod: function (methodName, args, cb) {
                    var result

                    if (typeof self._methods[methodName] !== 'function') {
                      cb(new Error(methodName + ' is not a registered method'))
                    }
                    else if (self._nudgeCluster()) {
                      cb(new Error('the cluster is not ready yet, try again in a few seconds'))
                    }
                    else {
                      result = self._methods[methodName].apply(self, args)

                      if (result instanceof Error) {
                        cb(result)
                      }
                      else {
                        if (result != null) {
                          self._dispatch(result)
                          cb(null, result)
                        }
                        else {
                          cb(null)
                        }
                      }
                    }
                  }
                }
              })

  this._reduce = opts.reduce
  this._methods = opts.methods
  this._gaggle = gaggle(gOpts)
  this._gaggle.on('committed', _.bind(this._onCommitted, this))
  // todo: pre-emptively nudge the cluster
  // this._gaggle.on('leaderElected', _.bind(this._onLeaderElected, this))
  this._subscriptions = []
  this._provisionalState = this._reduce(undefined, null)
  this._committedState = this._reduce(undefined, null)
}

Conflux.prototype._nudgeCluster = function _nudgeCluster () {
  // we don't actually have to check if we are leader at this time because the only
  // thing that calls nudgeCluster is a Method, and those are always dispatched on
  // a node that is a leader
  if (this._gaggle.isLeader() && this._gaggle.hasUncommittedEntriesInPreviousTerms()) {
    this._gaggle.append({
      type: NOOP_TYPE
    })

    return true
  }
  else {
    return false
  }
}

Conflux.prototype._onCommitted = function _onCommitted (entry) {
  if (entry.data.type === ACTION_TYPE) {
    this._committedState = this._reduce(this._committedState, entry.data.data)

    _.each(this._subscriptions, function (cb) {
      cb()
    })
  }
}

Conflux.prototype.subscribe = function subscribe (cb) {
  var self = this

  this._subscriptions.push(cb)

  return function unsubscribe () {
    _.remove(self._subscriptions, cb)
  }
}

Conflux.prototype._dispatch = function _dispatch (action) {
  return this._gaggle.append({
    type: ACTION_TYPE
  , data: action
  }).then(_.noop, _.noop)
}

Conflux.prototype.perform = function perform (methodName, args, timeout, cb) {

  if (typeof timeout === 'function') {
    cb = timeout
    timeout = -1
  }

  timeout = timeout == null ? -1 : timeout

  return this._gaggle.dispatchOnLeader('performMethod', [methodName, args], timeout)
  .then(function (ret) {
    if (typeof cb === 'function') {
      cb(null, ret[0])
    }
    else {
      return Promise.resolve(ret[0])
    }
  })
  .catch(function (err) {
    if (typeof cb === 'function') {
      cb(err)
    }
    else {
      return Promise.reject(err)
    }
  })
}

Conflux.prototype.getState = function getState () {
  return this._committedState
}

Conflux.prototype.getProvisionalState = function getProvisionalState () {
  var log = this._gaggle.getLog()
    , state = this._committedState
    , nextEntry

  // Save time by only applying uncommitted entries to the committed state
  for (var i=this._gaggle.getCommitIndex() + 1, ii=log.length; i<ii; ++i) {
    nextEntry = log[i].data

    /**
    * Ignoring branch coverage here because this branch should *always* be
    * taken unless something incredibly strange has happened.
    * Since only leaders call getProvisionalState and leaders are the only
    * nodes that add NOOP entries (the only non-action type entry right now)
    *, the NOOP entries will be committed before any method calls
    * getProvisionalState. That said, I'm a software developer first and a
    * computer scientist second, so I'm leaving this check in here as insurance.
    */

    /* istanbul ignore else */
    if (nextEntry.type === ACTION_TYPE) {
      state = this._reduce(state, nextEntry.data)
    }
  }

  return state
}

Conflux.prototype.close = function close () {
  var args = Array.prototype.slice.call(arguments)

  this._subscriptions = []

  this._gaggle.removeAllListeners()

  return this._gaggle.close.apply(this._gaggle, args)
}

module.exports = Conflux
