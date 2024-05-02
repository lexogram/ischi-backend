/**
 * server/middleware/jwToken.js
 *
 * makeToken()
 *   Creates a token with whatever payload is provided, with
 *   default or custom options.
 *   Currently called by treatSuccess in signIn.js, with the
 *   payload { id } (of the user who is signing in)
 *
 * verifyToken()
 *   Checks if a session cookie exists that contains a token
 *   If not, responds with 403 Forbidden
 *   If so, and the token is still valid and it contains values
 *   for `user_id` (and `organization_id`), sets req.xxx_id to
 *   the appropriate value(s)
 *   If not, responds with 401 Unauthorized
 * 
 * checkForToken()
 *   Allows the requested action to proceed even if no token is
 *   available. Adds `user_id` (and `organization_id`) to req if
 *   a valid token is found.
 */


const jwt = require("jsonwebtoken")
const JWT_SECRET = process.env.JWT_SECRET

const DEFAULTS = {
  algorithm: 'HS256',
  allowInsecureKeySizes: true
}


const makeToken = ( payload, options = {} ) => {
  if (typeof options !== "object") {
    // Ignore options if it's not an object
    options = {}
  }

  // Overwrite DEFAULTS with explicit options with the same key
  options = { ...DEFAULTS, ...options }

  // <<< Remove entries that can be in payload OR in options,
  // but not in both places. If this is not done, jwt.sign()
  // will throw an error.
  const onlyOne = {
    exp: "expiresIn",
    nbf: "notBefore",
    aud: "audience",
    sub: "subject",
    iss: "issuer"
  }

  Object.entries(onlyOne).forEach(( [ pay, opt ]) => {
    if (pay in payload) {
      delete options[opt]
    }
  })
  // Remove >>>

  const token = jwt.sign(
    payload,
    JWT_SECRET,
    options
  )

  return token
}


/**
 * Adds user_id (and perhaps organization_id) to req, if a valid
 * token is provided. Continues without this, if not.
 */
const checkForToken = (req, res, next) => {
  const token = req.session?.token

  if (!token) {
    return next()
  }

  verifyToken(req, res, next)
}



/**
 * Prevents the requeted action if no token is available or if
 * it is not valid. Adds user_id (and perhaps organization_id) to
 * req, if all is good.
 */
const verifyToken = (req, res, next) => {
  const token = req.session?.token

  let status = 0
  let message = ""

  if (!token) {
    status = 403 // Forbidden
    message = "No token provided"
    proceed()

  } else {
    jwt.verify(token, JWT_SECRET, treatVerification)
  }

  function treatVerification(error, payload) {
    if (error) {
      status = 401 // Unauthorized
      message = "Unauthorized"

    } else {
      req.user_id = payload.user_id
      req.organization_id = payload.organization_id // undefined?
      proceed()
    }
  }

  function proceed() {
    if (status) {
      return res.status(status).send({ message })
    }

    next()
  }
}


module.exports = {
  makeToken,
  verifyToken,
  checkForToken
}