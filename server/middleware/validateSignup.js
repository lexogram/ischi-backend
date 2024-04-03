/* middleware/validateSignup.js */

const { User } = require('../database')


const validateSignup = async (req, res, next) => {
  // If status and message remain falsy, username, email and
  // roles are all valid; next() will be called. If not,
  // res.status(status).send({ message }) will be called.
  let status = 0
  let message = ""


  // Sanity check: is there a body?
  const { body } = req
  if (typeof body !== "object") {
    return treatInvalid({ body })
  }

  function treatInvalid (data) {
    // data is not of the expected type
    let [ key, value ] = Object.entries(data)[0]
    let type = typeof value
    if (type === "string") {
      if (!value) {
        type = "empty string"
      }
      value = `"${value}"`
    } else if (type === "undefined") {
      type = "value"
    }
    status = 400 // Bad Request
    message = `FAIL: the ${type} ${value} is not a valid ${key}`

    // Validation failed. Don't run any more checks.
    proceed()
  }


  // These are the values that need to be checked
  const { username, email, password } = body

  // Check that they exist and are valid
  if (!username || typeof username !== "string") {
    return treatInvalid({ username })

  } else if (
      !email
   || typeof email !== "string"
   || email.indexOf("@") < 0
    ) {
    return treatInvalid({ email })

  } else if (!password || typeof password !== "string") {
    return treatInvalid({ password })
  }


  // Treating duplicates
  User
  .findOne({ username })
  .then(treatDuplicateUsername)
  .then(checkEmail)
  .catch(treatDBError)
  .finally(proceed)

  function treatDuplicateUsername(user) {
    if (user) {
      // A user with the given name already exists
      status = 400 // Bad Request
      message = `FAIL: username "${username}" is already taken`
    }
  }

  async function checkEmail() {
    if (!status) {
      await User
        .findOne({ email })
        .then(treatDuplicateEmail)
    }
  }

  function treatDuplicateEmail(user) {
    if (user) {
      // A user with the given email already exists
      status = 400 // Bad Request
      message = `FAIL: email "${email}" is already taken`
    }
  }


  // Treating server errors
  function treatDBError(error) {
    // The call to User.find() failed
    console.log("Error in signUp():\n", error);

    status = 500 // Internal Server Error
    message = "Internal Server Error"
  }


  // Deciding what to do now
  function proceed() {
    if (status) {
      // There was an error somewhere in the input values
      res.status(status).send({ message })

    } else {
      // No error: it's ok to create a new user
      next()
    }
  }
}


module.exports = {
  validateSignup
}