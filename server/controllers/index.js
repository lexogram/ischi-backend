/**
 * server/controllers/index.js
 */


const { signIn } = require('./signin.js')
const { signOut } = require('./signout.js')
const { signUp } = require('./signup.js')
const { signedIn } = require('./signedin.js')
const { treatQuery } = require('./treatQuery.js')
const { setPack } = require('./setPack.js')
const { getPacks } = require('./getPacks.js')
const { uploader } = require('./uploader.js')


module.exports = {
  signIn,
  signOut,
  signUp,
  signedIn,
  treatQuery,
  setPack,
  getPacks,
  uploader
}
