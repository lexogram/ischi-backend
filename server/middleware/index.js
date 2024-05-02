/**
 * server/middleware/index.js
 */


const {
  TEMP,
  PUBLIC,
  UPLOAD,
  absolutePath,
  moveFile
} = require('./directory.js')
const {
  makeToken,
  verifyToken,
  checkForToken
} = require('./jwToken.js')
const { readFields } = require('./multer.js')
const { validateSignup } = require('./validateSignup.js')


module.exports = {
  TEMP,
  PUBLIC,
  UPLOAD,
  absolutePath,
  moveFile,
  makeToken,
  verifyToken,
  checkForToken,
  readFields,
  validateSignup
}
