/**
 * server/app.js
 */


require('dotenv').config()

// Ensure that it's possible to connect to the database
require('./database')

const PORT = process.env.PORT || 3000
const COOKIE_SECRET = process.env.COOKIE_SECRET || "string needed"

// Utilities
const path = require('path')

// Create a basic http server running express
const http = require('http')
const express = require('express')
const cors = require('cors')
const cookieSession = require('cookie-session')

const cookieOptions = {
  name: "authorisation",
  keys: [ COOKIE_SECRET ],
  httpOnly: true,
  sameSite: true
}

// CORS
const corsOptions = require('./utilities/')


// WebSocket (more below)
const websocket = require('./websocket')


// Express
const app = express()
const server = http.createServer(app)

app.use(cors(corsOptions))
app.use(cookieSession(cookieOptions))

// Tell client/index.html where to find images and scripts
const staticPath = path.resolve(__dirname, '../public')
app.use(express.static(staticPath));
app.use(express.json())

require('./routes')(app)


app.get('/', (req, res) => {
  const protocol = req.protocol
  const host = req.headers.host
  res.send(`<pre>Connected to ${protocol}://${host}
${Date()}</pre>`)
})


// Start the server
server.listen(PORT, logHostsToConsole)


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
