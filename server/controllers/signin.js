/**
 * server/controllers/signin.js
 */


const bcrypt = require('bcryptjs')
const { User } = require('../database')
const { makeToken } = require('../middleware/jwToken')


function signIn(req, res, next) {
  const { username, email, id, password, auto_login } = req.body
  // id, here, may be either username or password

  let status = 0
  let message = next instanceof Function ? {} : next


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
    const { id, username, email } = user
    // id, here, is the unique value stored in MongoDB

    let token
    if (auto_login) {
      const maxAge = 90 * 24 * 3600 * 1000 // 90 days in ms
      req.sessionOptions = { maxAge }
      token = makeToken({ id, expiresIn: maxAge })

    } else { // create a token that expires when the session ends
      token = makeToken({ id })
    }

    req.session.token = token

    message.success = "signed_in",
    message.user = {
      username,
      email
    }
  }


  function treatError(error) {
    console.log("Error in signIn:\n", error);
    status = 401 // Unauthorized
    message.fail = "Invalid login credentials"
  }


  function proceed() {
    if (status) {
      res.status(status)
    }

    res.json(message)
  }
}


module.exports = {
  signIn
}