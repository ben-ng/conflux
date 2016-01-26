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

tap.test('can perform methods', function (t) {
  var opts = {
      clusterSize: 2
    , channel: {name: 'memory'}
    , methods: {
        foo: function (done) {
          this.dispatch({
            type: 'foo'
          }, done)
        }
      , bar: function (a, b, done) {
          var self = this

          setTimeout(function () {
            self.dispatch({
              type: 'bar'
            , a: a
            , b: b
            }, done)
          }, 10)
        }
      }
    , reduce: function (state, action) {
        if (state == null) {
          state = []
        }
        else {
          state = JSON.parse(JSON.stringify(state))
        }

        return state.concat(action)
      }
    }
  , a = conflux(_.assign({id: uuid.v4()}, opts))
  , b = conflux(_.assign({id: uuid.v4()}, opts))
  , unsubscribe
  , lastStateOfA

  t.plan(4)

  unsubscribe = a.subscribe(function () {
    lastStateOfA = a.getState()
  })

  a.perform('foo', [], 5000)
  .then(function () {
    t.pass('should perform foo')

    return b.perform('bar', ['fee', 'fi'], 5000)
  })
  .then(function () {
    t.pass('should perform bar')

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
