/**
 * server/routes/index.js
 */


const {
  signUp,
  signIn,
  signOut,
  uploader,
  treatQuery
} = require('../controllers')
const {
  readFields,
  validateSignup
} = require('../middleware')


const routes = (app) => {
  app.post("/signup", validateSignup, signUp)
  app.post("/signin", signIn)
  app.post("/signout", signOut)
  app.post("/images/set", readFields, uploader)
  app.post("/images/get", treatQuery)
}


module.exports = routes