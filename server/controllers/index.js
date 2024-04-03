/**
 * server/controllers/index.js
 */


const { signIn } = require('./signin.js')
const { signOut } = require('./signout.js')
const { signUp } = require('./signup.js')
const { treatQuery } = require('./treatQuery.js')
const { uploader } = require('./uploader.js')


module.exports = {
  signIn,
  signOut,
  signUp,
  treatQuery,
  uploader
}
