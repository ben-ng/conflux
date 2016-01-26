var conflux = require('../')
  , tap = require('tap')

tap.test('validates required options', function (t) {
  t.plan(1)

  t.throws(function () {
    conflux()
  }, /is required/, 'should throw on missing arguments')
})
