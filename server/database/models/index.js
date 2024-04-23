/**
 * server/database/models/index.js
 */


const { Image } = require('./image.js')
const { Pack } = require('./pack.js')
const { User } = require('./user.js')


module.exports = {
  Image,
  Pack,
  User
}
