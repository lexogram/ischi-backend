/**
 * server/app.js
 */


require('dotenv').config()

// Connect to the database or process.exit() if it's not possible
require('./database')


// <<< HARD-CODED certificate names
const certificates = {
  key: "key.pem",
  cert: "cert.pem"
}
// HARD-CODED >>


const fs = require("fs");
const path = require("path")
const https = require("https");

const express = require("express");
const cors = require('cors')
const cookieSession = require('cookie-session')

const websocket = require('./websocket')

const PORT = process.env.PORT || 3000
const IS_DEV = process.env.NODE_ENV === "development"
const COOKIE_SECRET = process.env.COOKIE_SECRET || "string needed"
const HOST = process.env.HOST || "localhost";
const NAME = process.env.NAME || "Secure";


const getCertPaths = (directoryPath) => {
  const errors = {}
  const keys = Object.keys(certificates)
  const certsExist = keys.every( key => {
    const certPath = path.join(directoryPath, certificates[key])
    const certExists = fs.existsSync(certPath)

    if (certExists) {
      certificates[key] = certPath
    } else {
      errors[key] = certificates[key]
    }

    return certExists
  })

  if (!certsExist) {
    console.log("Missing or misnamed certificates", errors)
    process.exit(0)
  }

  return certificates
}


// Run express in HTTPS mode. This allows cookies with
// `sameSite: "none"` and  `secure: true` to be sent from the
// server and treated in the browser.

const certPath = path.join(__dirname, "certificates", HOST)
const certPaths = getCertPaths(certPath)
// console.log("certPaths:", certPaths);


const app = express();

// Create a NodeJS HTTPS listener on PORT that points to the
// Express app
// Use a callback function to tell when the server is created.
const server = https.createServer({
    key: fs.readFileSync(certPaths.key),
    cert: fs.readFileSync(certPaths.cert),
  }, app)
  .listen(PORT, logStuffToConsole);

function logStuffToConsole() {
  console.log(
    `${NAME} server listening at HTTPS://${HOST}:${PORT}`
  );
}


// CORS
const origin = IS_DEV
  ? JSON.parse(process.env.ORIGIN_DEV)
  : process.env.ORIGIN

console.log("origin:", origin);
console.log("process.version:", process.version);



const corsOptions = {
  origin,
  // some legacy browsers (IE11, various SmartTVs) choke on 204
  optionsSuccessStatus: 200,
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
}
app.use(cors(corsOptions))


// COOKIES
const cookieOptions = {
  name: "authorisation",
  keys: [ COOKIE_SECRET ],
  httpOnly: true,
  sameSite: "none",
  secure: true,
  partitioned: true,
}
app.use(cookieSession(cookieOptions))


// REQ.BODY
app.use(express.json())


// Find the "./public" directory relative to this script,
// regardless of where this script was launched from.
// (express.static() will use process.env.cwd() as the root, which
// is incorrect if this script is called from its parent folder.)
const public = path.resolve(process.cwd(), "public")
console.log("public:", public);

// Tell client/index.html where to find images and scripts
app.use(express.static(public));


require('./routes')(app)


app.get('/', (req, res) => {
  const protocol = req.protocol
  const host = req.headers.host
  res.send(`<pre>Connected to ${protocol}://${host}
${Date()}</pre>`)
})


// Add a WebSocket that uses the ws:// protocol and can keep a
// TCP channel open and push messages through it to the client
websocket(server)


require('./games')