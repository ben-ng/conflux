var conflux = require('../')
  , _ = require('lodash')
  , tap = require('tap')
  , uuid = require('uuid')
  , async = require('async')
  , Promise = require('bluebird')

tap.test('nudges the cluster when needed', function (t) {
  var opts = {
      clusterSize: 2
    , channel: {name: 'memory'}
    , methods: {
        foobar: function (done) {
          return 'foo'
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

  t.plan(7)

  async.whilst(function () {
    return !a._gaggle.isLeader() && !b._gaggle.isLeader()
  }, function (next) {
    setTimeout(next, 100)
  }, function () {
    t.pass('one of the nodes became a leader')

    var leader = a._gaggle.isLeader() ? a : b
      , follower = b === leader ? a : b

    // Keep elections going until we elect processB as leader
    async.whilst(function () {
      return !follower._gaggle.isLeader()
    }, function (next) {
      follower._gaggle._beginElection()
      setTimeout(next, 1000)
    }, function () {
      var earlierTerm = follower._gaggle._currentTerm - 1
        , oldCommitIndex = follower._gaggle._commitIndex
        , temp

      temp = leader
      leader = follower
      follower = temp

      // Time for some hacky manipulation. We need to insert a log entry into an earlier term.
      leader._gaggle._log.push({term: earlierTerm, data: {type: 'ACTION', data: 'foo'}})
      follower._gaggle._log.push({term: earlierTerm, data: {type: 'ACTION', data: 'foo'}})

      leader.perform('foobar', [])
      .catch(function (err) {
        t.equals(err.toString()
          , 'Error: the cluster is not ready yet, try again in a few seconds'
          , 'should fail with an error about the cluster not being ready')

        return new Promise(function (resolve, reject) {
          async.whilst(function () {
            return leader._gaggle._commitIndex === oldCommitIndex
          }, function (next) {
            setTimeout(next, 100)
          }, function () {
            t.pass('the leader has incremented its commit index')
            resolve()
          })
        })
        .then(function () {
          t.ok(_.find(leader._gaggle._log, function (e) {
            return e.data.type === 'NOOP'
          }) != null, 'a NOOP entry was appended')

          leader.perform('foobar', [])
          .then(function () {
            t.pass('performed the action once nudged')

            t.deepEquals(leader.getProvisionalState(), ['foo', 'foo'], 'should get the correct provisional state')

            return Promise.all([leader.close(), follower.close()])
          })
          .then(function () {
            t.pass('cleanly closed the instances')
          })
        })
      })
    })
  })
})
