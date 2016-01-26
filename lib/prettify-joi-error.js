module.exports = function prettifyJoiError (err) {
  return 'Invalid options: ' + err.details.map(function (e) {
    return e.message
  }).join(', ')
}
