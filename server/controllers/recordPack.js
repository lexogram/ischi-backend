/**
 * server/controllers/setPack.js
 * 
 * Creates a Pack record
 */

const { Pack } = require('../database')


function recordPack(record, callback) {
  const { folder } = record // should be unique
  Pack
    .updateOne({ folder }, record, { upsert: true })
    .then(treatResult)
    .catch(treatError)


  function treatResult(result) {
    callback(null, "Pack record saved")
  }

  function treatError(error) {
    callback(error)
  }
}


module.exports = {
  recordPack
}