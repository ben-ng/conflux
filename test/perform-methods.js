var conflux = require('../')
  , _ = require('lodash')
  , tap = require('tap')
  , uuid = require('uuid')
  , async = require('async')
  , Promise = require('bluebird')

tap.test('fails when an unknown method is called', function (t) {
  var opts = {
      clusterSize: 2
    , channel: {name: 'memory'}
    , methods: {}
    , reduce: function (state, action) {
        return {}
      }
    }
  , a = conflux(_.assign({id: uuid.v4()}, opts))
  , b = conflux(_.assign({id: uuid.v4()}, opts))

  t.plan(2)

  a.perform('zooby')
  .catch(function (err) {
    t.equals(err.toString(), 'Error: zooby is not a registered method', 'fails with the expected error')
  })
  .finally(function () {
    return Promise.all([a.close(), b.close()])
  })
  .then(function () {
    t.pass('cleanly closed the instances')
  })
})

tap.test('can perform methods (promise API)', function (t) {
  var opts = {
      clusterSize: 2
    , channel: {name: 'memory'}
    , methods: {
        foo: function () {
          return {
            type: 'foo'
          }
        }
      , bar: function (a, b) {
          return {
            type: 'bar'
          , a: a
          , b: b
          }
        }
      , fez: function () {
          return null
        }
      , bork: function () {
          return new Error('nope')
        }
      }
    , reduce: function (state, action) {
        if (state == null) {
          state = []
        }
        else {
          state = JSON.parse(JSON.stringify(state))
        }

        if (action == null) {
          return state
        }
        else {
          return state.concat(action)
        }
      }
    }
  , a = conflux(_.assign({id: uuid.v4()}, opts))
  , b = conflux(_.assign({id: uuid.v4()}, opts))
  , unsubscribe
  , lastStateOfA

  t.plan(7)

  unsubscribe = a.subscribe(function () {
    lastStateOfA = a.getState()
  })

  a.perform('foo', [], 5000)
  .then(function (act) {
    t.pass('should perform foo')

    t.deepEquals(act, {type: 'foo'}, 'should respond with the foo action')

    return b.perform('bar', ['fee', 'fi'], 5000)
  })
  .then(function () {
    t.pass('should perform bar')

    return a.perform('fez', [], 5000)
  })
  .then(function () {
    t.pass('should noop when Methods return null')

    return a.perform('bork', [], 5000)
  })
  .catch(function (err) {
    t.equals(err.message, 'nope', 'should fail when Methods return Errors')

    return Promise.resolve()
  })
  .then(function () {
    async.whilst(function () {
      return a.getState().length !== 2
    }, function (next) {
      setTimeout(next, 100)
    }, function () {
      t.deepEquals(lastStateOfA, [
        {type: 'foo'}
      , {type: 'bar', a: 'fee', b: 'fi'}
      ], 'the state should be correct')

      Promise.all([a.close(), b.close()])
      .then(function () {
        unsubscribe()

        t.pass('cleanly closed the instances')
      })
    })
  })
})

tap.test('can perform methods (callback API)', function (t) {
  var opts = {
      clusterSize: 2
    , channel: {name: 'memory'}
    , methods: {
        foo: function () {
          return {
            type: 'foo'
          }
        }
      , bar: function (a, b) {
          return {
            type: 'bar'
          , a: a
          , b: b
          }
        }
      , fez: function () {
          return null
        }
      , bork: function () {
          return new Error('nope')
        }
      }
    , reduce: function (state, action) {
        if (state == null) {
          state = []
        }
        else {
          state = JSON.parse(JSON.stringify(state))
        }

        if (action == null) {
          return state
        }
        else {
          return state.concat(action)
        }
      }
    }
  , a = conflux(_.assign({id: uuid.v4()}, opts))
  , b = conflux(_.assign({id: uuid.v4()}, opts))
  , unsubscribe
  , lastStateOfA

  t.plan(7)

  unsubscribe = a.subscribe(function () {
    lastStateOfA = a.getState()
  })

  a.perform('foo', [], function (err, act) {
    t.ifError(err, 'should perform foo without errors')
    t.deepEquals(act, {type: 'foo'}, 'should respond with the foo action')

    b.perform('bar', ['fee', 'fi'], 5000, function (err) {
      t.ifError(err, 'should perform bar without errors')

      a.perform('fez', [], 5000, function (err) {
        t.ifError(err, 'should noop when Methods return null without error')

        a.perform('bork', [], 5000, function (err) {
          t.equals(err.message, 'nope', 'should fail when Methods return Errors')

          async.whilst(function () {
            return a.getState().length !== 2
          }, function (next) {
            setTimeout(next, 100)
          }, function () {
            t.deepEquals(lastStateOfA, [
              {type: 'foo'}
            , {type: 'bar', a: 'fee', b: 'fi'}
            ], 'the state should be correct')

            Promise.all([a.close(), b.close()])
            .then(function () {
              unsubscribe()

              t.pass('cleanly closed the instances')
            })
          })
        })
      })
    })
  })
})
