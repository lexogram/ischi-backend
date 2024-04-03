/**
 * server/controllers/signup.js
 */


const bcrypt = require('bcryptjs')
const { User } = require('../database')
const { makeToken } = require('../middleware')


function signUp(req, res) {
  const { username, organisation, email, password } = req.body

  const hash = bcrypt.hashSync(password, 8)
  const userData = organisation
    ? { username, organisation, email, hash }
    : { username, email, hash }

  let message

  new User(userData)
    .save()
    .then(treatSuccess)
    .catch(treatError)
    .finally(proceed)

  function treatSuccess(user) {
    const { username, email, id } = user
    message = {
      message: "User record created",
      user: {
        username,
        email
      }
    }
    message = JSON.stringify(message, null, "  ")
    const token = makeToken({ id })
    req.session.token = token
  }

  function treatError(error) {
    message = `ERROR: User for "${username}" not saved
${error}`
  }

  function proceed () {
    res.send(message )
  }
}


module.exports = {
  signUp
}
