/**
 * server/utilities/cors.js
 *
 * CORS requires information on which external sites are allowed
 * to access files on this server. One way to do this is to
 * provide an array of acceptable hosts. Hosts can be defined as
 * strings, like "http://domain.name:1234" or as regular
 * expressions, like /https?:\/\/domain\.name(:\d+)?/i
 *
 *   [ "http://domain.name:1234",
 *     /https?:\/\/domain\.name(:\d+)?/i
 *   ]
 *
 * When reading from the .env file, backslash characters need to
 * be escaped with a backslash character (\\). The data from the
 * .env file will be read in as a string, and then processed by
 * JSON.parse(), so all regular expressions must be enclosed in
 * double-quotes.
 *
 * String hosts will be built up from their constituent parts
 * (protocol, host, port), so no backslash characters should be
 * needed.
 *
 *  PROTOCOL=http
 *  ORIGINS=["/localhost(:\\d+)?$/i", "127.0.0.1" ]
 *  PORTS=[3000,3001]
 *
 * The .env entries above will allow access to any port on
 * localhost, or to sites running at http://127.0.0.1:3000 or
 * http://127.0.0.1:3001.
 */



// Cross-Origins connections
const PROTOCOL = process.env.PROTOCOL || "https"
const ORIGINS = process.env.ORIGINS
const PORTS = process.env.PORTS

// console.log("PROTOCOL:", PROTOCOL);
// console.log("ORIGINS:", ORIGINS);
// console.log("PORTS:", PORTS);

const IS_REGEX = /^\/(.+)\/(.+)?/ // /expression/flags?



let originsParsed = false
let isOnLAN = true // will be set to false if there is any doubt

// Determine which ports are allowed
const ports = (() => {
  try {
    const ports = JSON.parse(PORTS)
    return ports
  } catch(error) {
    return []
  }
})()
// console.log("ports:", ports);

// Define which domains are allowed...
let allowedOrigins
try {
  allowedOrigins = JSON.parse(ORIGINS)
  // console.log("parsed allowedOrigins:", allowedOrigins);

  // Convert RegExp string to regular expressions and apply
  // the appropriate PROTOCOL to all non-RegExp strings
  allowedOrigins = allowedOrigins.map( origin => {
    const regexMatch = IS_REGEX.exec(origin)

    if (regexMatch) {
      // console.log("regexMatch:", regexMatch);

      // Extract the regular expression and use it
      const [ , expression, flags ] = regexMatch
      // console.log("expression:", expression);
      // console.log("flags:", flags);

      isOnLAN = isOnLAN && isLocalHost(expression)
      origin = new RegExp(expression, flags)
      // console.log("(in map) regex allowedOrigins:", allowedOrigins);

    } else {
      // Apply the given protocol to every string host
      isOnLAN = isOnLAN && isLocalHost(origin)
      origin = `${PROTOCOL}://${origin}`
      // console.log("(in map) standard allowedOrigins:", allowedOrigins);
    }

    return origin
  })

  // console.log("mapped allowedOrigins:", allowedOrigins);

  // ... and include all the acceptable ports
  allowedOrigins = allowedOrigins.reduce(( allowed, origin ) => {
    allowed.push(origin) // in all cases, RegExp or raw string

    if (origin instanceof RegExp || /:\d+$/.test(origin)) {
      // Ignore Regular Expressions and entries with a port
      // console.log("RegExp simply added as is")

    } else {
      // console.log("Adding ports:", ports)
      ports.forEach( port => allowed.push(`${origin}:${port}`))
    }

    return allowed
  }, [])

  originsParsed = true

} catch (error) {
  // Prevent all connections on a public-facing server if
  // .env is not correctly set up
  console.log(`Caught ${error}`)

  allowedOrigins = []
}

// console.log("allowedOriginsParsed:", allowedOriginsParsed);
// console.log("isOnLAN:", isOnLAN);
// console.log("treated allowedOrigins:", allowedOrigins);



if (!allowedOrigins.length && originsParsed && isOnLAN) {
  // Allow all connections when working on a local network
  // console.log("setting allowedOrigins safely to *")
  allowedOrigins = "*"
}

function isLocalHost(expression) {
  if (/^localhost(:\d+)?$/.test(expression)) {
    return true
  } else if (/0\.0\.0\.0/.test(expression)) {
    return true
  } else if (/127\.0\.0\.1/.test(expression)) {
      return true
  } else if (/192\.168\./.test(expression)) {
    return true
  } else if (/10\./.test(expression)) {
    return true
  } else {
    const match = /172\.(\d{2})\./.exec(expression)
    if (match && match[1] > 15 && match[1] < 32) {
      return true
    }
  }

  return false
}

// console.log("allowedOrigins:", allowedOrigins)


const corsOptions = {
  origin: (origin, callback) => {
    // console.log("corsOptions allowedOrigins:", allowedOrigins);

    const lower = (origin || "").toLowerCase() // may be undefined
    let isAllowed = false

    const authorized = allowedOrigins.some( allowed => {
      // console.log("allowed:", allowed);
      if (allowed instanceof RegExp) {
        isAllowed = allowed.test(allowedOrigins)
        isAllowed && console.log(`
          ${allowedOrigins} matches ${allowed}
        `
        )

      } else if (typeof allowed === "string") {
        isAllowed = lower === allowed.toLowerCase()
        isAllowed && console.log(`
          ${allowedOrigins} case-insensitive matches ${allowed}
        `
        )

      } else { // should not happen
        isAllowed = allowedOrigins === allowed
        isAllowed && console.log(`
          ${allowedOrigins} === ${allowed}
        `
        )
      }

      return isAllowed
    })

    if (authorized || !allowedOrigins) {
      // console.log(`${allowedOrigins} is authorized
      // `)

    } else {
      // console.log(`${allowedOrigins} should be refused access
      // `)
    }

    callback(null, allowedOrigins)
  }
}

// console.log("corsOptions:", corsOptions);


module.exports = corsOptions