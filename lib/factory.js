var Joi = require('joi')
  , prettifyJoiError = require('./prettify-joi-error')
  , Conflux = require('./conflux')
  , schema

/**
* Validate the bare minimum, leave the rest up to the Channel and Gaggle
* constructors to handle.
*/
schema = Joi.object().keys({
  // Conflux Options
  reduce: Joi.func()
, methods: Joi.object()

  // Gaggle
, id: Joi.string()
, clusterSize: Joi.number().min(1)
, channel: Joi.object()
}).requiredKeys([
  'reduce'
, 'methods'
, 'id'
, 'clusterSize'
, 'channel'
])


module.exports = function ConfluxFactory (opts) {
  var validatedOptions = Joi.validate(opts || {}, schema, {allowUnknown: true, stripUnknown: false})

  if (validatedOptions.error != null) {
    throw new Error(prettifyJoiError(validatedOptions.error))
  }

  return new Conflux(validatedOptions.value)
}
