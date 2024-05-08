/**
 * server/routes/index.js
 */


const {
  signUp,
  signIn,
  signOut,
  signedIn,
  // uploader,
  // treatQuery,
  setPack,
  getPacks,
  savePack,
  getOwnedPacks
} = require('../controllers')
const {
  readFields,
  validateSignup,
  verifyToken,
  checkForToken
} = require('../middleware')


const routes = (app) => {
  app.post("/signup", validateSignup, signUp)
  app.post("/signin", signIn)
  app.post("/signout", signOut)
  app.get( '/signedin', verifyToken, signedIn)
  // app.post("/images/set", readFields, uploader)
  // app.post("/images/get", treatQuery)
  app.post("/packs/get", getPacks)
  app.post("/packs/set", setPack)
  app.post("/save", verifyToken, readFields, savePack)
  app.post("/owned", checkForToken, getOwnedPacks)
}


module.exports = routes