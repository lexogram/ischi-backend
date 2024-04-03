// Create a basic http server running express
const http = require('http')
const express = require('express')
const cors = require('cors')

// Utilities
const path = require('path')

require('dotenv').config() // read from .env before using cors.js
const PORT = process.env.PORT || 3000

// const openDB =
require('./data/connection.js')


// CORS
const corsOptions = require('./utilities/cors')
// console.log("allowedOrigins:", allowedOrigins);


// WebSocket (more below)
const websocket = require('./websocket')


// Express
const app = express()
const server = http.createServer(app)


// Start the server
server.listen(PORT, optionalCallbackForListen)



async function optionalCallbackForListen() {
  logHostsToConsole()
  // const db = await openDB()
  // console.log("db:", db);
  
}

//Print out some useful information in the Terminal
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


app.use(cors(corsOptions))


// Tell client/index.html where to find images and scripts
const staticPath = path.resolve(__dirname, '../public')
app.use(express.static(staticPath));


app.get('/ping', (req, res) => {
  const protocol = req.protocol
  const host = req.headers.host
  res.send(`<pre>Connected to ${protocol}://${host}
${Date()}</pre>`)
})


app.get('/echo-req', (req, res) => {

  const headerOrigin = req.header('Origin')
  const remoteAddress = req.socket.remoteAddress
  const _ = "____"
  const headers = {...req.headers, _, headerOrigin, remoteAddress}

  const replacer = (key, value) => {
    if (value === undefined) {
      return "--undefined--"
    }

    return value
  }

  const message = `<pre>
${JSON.stringify(headers, replacer, "  ")}
</pre>`
  res.send(message)
})


// Add a WebSocket that uses the ws:// protocol and can keep a
// TCP channel open and push messages through it to the client
websocket(server)


require('./games')
