var gaggle = require('gaggle')
  , _ = require('lodash')
  , Conflux
  , ACTION_TYPE = 'ACTION'

Conflux = function Conflux (opts) {

  var self = this
    , gOpts = _.assign(_.omit(opts, 'reduce', 'methods'), {
                accelerateHeartbeats: true
              , rpc: {
                  performMethod: function (methodName, args, done) {
                    if (typeof self._methods[methodName] !== 'function') {
                      done(new Error(methodName + ' is not a registered method'))
                    }
                    else {
                      self._methods[methodName].apply(self, args.concat(done))
                    }
                  }
                }
              })

  this._reduce = opts.reduce
  this._methods = opts.methods
  this._gaggle = gaggle(gOpts)
  this._gaggle.on('committed', _.bind(this._onCommitted, this))
  this._subscriptions = []
  this._state = null
}

Conflux.prototype._onCommitted = function _onCommitted (entry) {
  if (entry.data.type === ACTION_TYPE) {
    this._state = this._reduce(this._state, entry.data.data)

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

Conflux.prototype.dispatch = function dispatch (action, cb) {
  return this._gaggle.append({
    type: ACTION_TYPE
  , data: action
  }, cb)
}

Conflux.prototype.perform = function perform (methodName, args, timeout, cb) {
  return this._gaggle.dispatchOnLeader('performMethod', [methodName, args], timeout, cb)
}

Conflux.prototype.getState = function getState () {
  return this._state
}

Conflux.prototype.close = function close () {
  var args = Array.prototype.slice.call(arguments)

  this._subscriptions = []

  return this._gaggle.close.apply(this._gaggle, args)
}

module.exports = Conflux
