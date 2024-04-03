/* middleware/jwToken.js */

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
      req.userId = payload.id
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
  verifyToken
}