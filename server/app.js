/**
 * server/app.js
 */


require('dotenv').config()

// Ensure that it's possible to connect to the database
require('./database')

const PORT = process.env.PORT || 3000
const IS_DEV = process.env.NODE_ENV === "development"
const COOKIE_SECRET = process.env.COOKIE_SECRET || "string needed"

// Find the "./public" directory relative to this script,
// regardless of where this script was launched from.
// (express.static() will use process.env.cwd() as the root, which
// is incorrect if this script is called from its parent folder.)
const path = require('path')
const public = path.resolve(process.cwd(), "public")

// WebSocket, CORS and cookies (more below)
const websocket = require('./websocket')
const cors = require('cors')
const cookieSession = require('cookie-session')


// Run express in HTTPS mode during development. In production,
// express will run locally in HTTP mode and nginx will provide
// an HTTPS proxy for it.
// This allows cookies with sameSite: "none" and  secure: true
// to be sent from the server and treated in the browser.
// NOTE: the https/ folder will be added to .gitignore, since it
// won't be needed for deployment
let express,
    app,
    server

if (IS_DEV) {
  const https = require("../https/server");

  const HOST = process.env.HOST || "localhost";
  const NAME = process.env.NAME || "Secure";

  ({ express, app, server } = https(HOST, PORT, NAME));

} else {
  // In production, express will run in HTTP mode by default
  const http = require('http')
  express = require('express')
  app = express()
  server = http.createServer(app)
  server.listen(PORT, logHostsToConsole)
}


// CORS
// const corsOptions = require('./utilities/')
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174"
  ],
  // some legacy browsers (IE11, various SmartTVs) choke on 204
  optionsSuccessStatus: 200,
  credentials: true
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


// Tell client/index.html where to find images and scripts
app.use(express.static(public));
app.use(express.json())


require('./routes')(app)


app.get('/', (req, res) => {
  const protocol = req.protocol
  const host = req.headers.host
  res.send(`<pre>Connected to ${protocol}://${host}
${Date()}</pre>`)
})


function logHostsToConsole() {
  // Check what IP addresses are used by your
  // development computer.
  const nets = require("os").networkInterfaces()
  const ips = Object.values(nets)
  .flat()
  .filter(({ family }) => (
    family === "IPv4")
  )
  .map(({ address }) => address)

  // ips will include `127.0.0.1` which is the
  // "loopback" address for your computer. This
  // address is not accessible from other
  // computers on your network. The host name
  // "localhost" can be used as an alias for
  // `127.0.0.1`, so you can add that, too.
  ips.unshift("localhost")

  // Show in the Terminal the URL(s) where you
  // can connect to your server
  const hosts = ips.map( ip => (
    `http://${ip}:${PORT}`)
  ).join("\n  ")
  console.log(`Express server listening at:
  ${hosts}
  `);
}


// Add a WebSocket that uses the ws:// protocol and can keep a
// TCP channel open and push messages through it to the client
websocket(server)


require('./games')