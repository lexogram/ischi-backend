/**
 * middleware/validateSignup.js
 */


const bcrypt = require('bcryptjs')
const { User } = require('../database')
const { signIn } = require('../controllers/signin')


const validateSignup = async (req, res, next) => {
  // If status and message remain falsy, username, email and
  // roles are all valid; next() will be called. If not,
  // res.status(status).send({ message }) will be called.

  // If the sign-up details contain the email and password of an
  // existing User, then next (signUp) will be replaced by signIn

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
      const duplicate = detailsCorrect(user)
      // false | { pass: { username [,email] }[, fail: {email}]}

      if (!duplicate || duplicate.fail?.email) {
        // A user with the given username already exists, but the
        // given email or password was wrong
        status = 400 // Bad Request
        message = { fail: { username } }

        // If the email address passed, then treatDuplicateEmail
        // will be called next, and the user will be logged in.
      }
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
      const duplicate = detailsCorrect(user)
      // false | { pass: { email, ...}}

      if (duplicate) {
        // The user provided an existing email address and the
        // correct password. The username may or may not be
        // correct. Perhaps they had forgotten that they had
        // already created an account.
        next = () => signIn(req, res, duplicate)

      } else {
        // A user with the given email already exists, but the
        // given password was wrong
        status = 400 // Bad Request
        message = { fail: { email } }
      }
    }
  }


  /**
   * Called if a user is found with the same username or email.
   * Checks if the given password matches the sign-up password.
   * If not, warn the user that the username or email is already
   * taken: return false.
   * If so, there is a good chance that the user mistook the
   * Sign Up form for the Sign In form: return an object showing
   * whether the other contact detail (email or username) was
   * also correct. If the email address is correct, sign the
   * user in. If only the username is correct, this might be a
   * coincidence where a common username and a common password
   * happen to overlap.
   *
   * @param {object} user: { username, email, password, ...}
   * @returns false | { pass: { ... } [, fail: {...} ] }
   *          If an object is returned, `pass` will contain at
   *          least one entry. `fail` will be omitted if both
   *          username and email pass.
   */
  function detailsCorrect(user) {
    if (!bcrypt.compareSync(password, user.hash)) {
      return false
    }

    const pass = {}
    const fail = {}
    const result = { pass, fail }

    let where = (user.username === username) ? pass : fail
    where.username = username

    where = (user.email === email) ? pass : fail
    where.email = email

    if (!Object.keys(fail).length) {
      delete result.fail
    }

    return result
  }


  // Treating server errors
  function treatDBError(error) {
    // The call to User.find() failed
    console.log("Error in signUp():\n", error);

    status = 500 // Internal Server Error
    message = { fail: "Internal Server Error" }
  }


  // Deciding what to do now
  function proceed() {
    if (status) {
      // There was an error somewhere in the input values
      res.status(status).json( message )

    } else {
      // No error: it's ok to create a new user
      next()
    }
  }
}


module.exports = { validateSignup }