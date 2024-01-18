// Create a basic http server running express
const http = require('http')
const express = require('express')
const cors = require('cors')

// Utilities
const path = require('path')

require('dotenv').config() // read from .env before using cors.js
const PORT = process.env.PORT || 3000


// CORS
const origin = require('./utilities/cors')


// WebSocket (more below)
const websocket = require('./websocket')


// Express
const app = express()
const server = http.createServer(app)

// Start the server
server.listen(PORT, () => {
  console.log(`http server running on port ${PORT}`)
})

// app.use(cors) must come before setting the static path
app.use(cors({ origin }))

// Tell client/index.html where to find images and scripts
const staticPath = path.resolve(__dirname, '../public')
app.use(express.static(staticPath));

app.get('/', (req, res) => {
  res.send(`<pre>Connected to port ${PORT}
${Date()}</pre>`)
})

// Add a WebSocket that uses the ws:// protocol and can keep a
// TCP channel open and push messages through it to the client
websocket(server)

require('./games')
