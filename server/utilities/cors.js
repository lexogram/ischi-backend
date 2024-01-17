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



// Cross-Origin connections
const PROTOCOL = process.env.PROTOCOL || "https"
const ORIGINS = process.env.ORIGINS
const PORTS = process.env.PORTS

// console.log("PROTOCOL:", PROTOCOL);
// console.log("ORIGINS:", ORIGINS);
// console.log("PORTS:", PORTS);



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
let origin
try {
  origin = JSON.parse(ORIGINS)
  // console.log("parsed origin:", origin);

  origin = origin.map( origin => {
    const match = /\/(.+)\/(.+)?/.exec(origin)

    if (match) {
      // console.log("match:", match);

      // Extract the regular expression and use it
      const [ , expression, options ] = match
      // console.log("expression:", expression);
      // console.log("options:", options);


      isOnLAN &&= isLocalHost(expression)
      origin = new RegExp(expression, options)
      // console.log("(in map) regex origin:", origin);


    } else {
      // Apply the given protocol to every string host
      isOnLAN &&= isLocalHost(origin)
      origin = `${PROTOCOL}://${origin}`
      // console.log("(in map) standard origin:", origin);

    }

    return origin
  })

  // console.log("mapped origin:", origin);

  // ... and include all the acceptable ports
  origin = origin.reduce(( origin, hostname ) => {
    origin.push(hostname) // in all cases, RegExp or raw string

    if (hostname instanceof RegExp || /:\d+$/.test(hostname)) {
      // Ignore Regular Expressions and entries with a port
      // console.log("RegExp simply added as is")
    } else {
      // console.log("Adding ports:", ports)
      ports.forEach( port => origin.push(`${hostname}:${port}`))
    }

    return origin
  }, [])

  originsParsed = true

} catch (error) {
  // Prevent all connections on a public-facing server if
  // .env is not correctly set up
  console.log(`Caught ${error}`)

  origin = []
}

// console.log("originsParsed:", originsParsed);
// console.log("isOnLAN:", isOnLAN);
// console.log("treated origin:", origin);



if (!origin.length && originsParsed && isOnLAN) {
  // Allow all connections when working on a local network
  // console.log("setting origin safely to *")
  origin = "*"
}

function isLocalHost(expression) {
  if (/localhost/.test(expression)) {
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

// console.log("module.exports =", origin);

module.exports = origin
