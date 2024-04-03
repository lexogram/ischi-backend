/**
 * server/controllers/signin.js
 */


const bcrypt = require('bcryptjs')
const { User } = require('../database')
const { makeToken } = require('../middleware')


function signIn(req, res) {
  const { username, email, id, password } = req.body
  // id, here, may be either username or password

  let status = 0
  let message = ""


  // Allow user to log in with either username or email
  const promises = [
    findUser({ email }),
    findUser({ username }),
    findUser({ email: id }),
    findUser({ username: id })
  ]


  Promise.any(promises)
    .then(treatSuccess)
    .catch(treatError)
    .finally(proceed)


  function findUser(query) {
    return new Promise((resolve, reject ) => {
      User.findOne(query)
        .then(checkPassword)
        .catch(reject)

      function checkPassword(user) {
        if (user) {
          const pass = bcrypt.compareSync(password, user.hash)
          if (pass) { // true or false
            return resolve(user)
          }
        }

        reject()
      }
    })
  }


  function treatSuccess(user) {
    const { id } = user
    // id, here, is the unique value stored in MongoDB
    const token = makeToken({ id })
    req.session.token = token
    message = { success: "Logged in!" }
  }


  function treatError(error) {
    console.log("Error in signIn:\n", error);
    status = 401 // Unauthorized
    message = { fail: "Invalid login credentials" }
  }


  function proceed() {
    if (status) {
      res.status(status)
    }

    res.send(message)
  }
}


module.exports = {
  signIn
}