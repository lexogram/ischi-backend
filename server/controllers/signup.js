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

  let message = {}

  new User(userData)
    .save()
    .then(treatSuccess)
    .catch(treatError)
    .finally(proceed)

  function treatSuccess(user) {
    const { username, email, id } = user
    message.success = "User record created",
    message.user = {
      username,
      email
    }
  }

  function treatError(error) {
    console.log("signUp error:", req.body, error);

    message.fail = `User for "${username}" not saved`
  }

  function proceed () {
    res.json(message )
  }
}


module.exports = {
  signUp
}
