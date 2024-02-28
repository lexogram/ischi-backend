/**
 * websocket.js
 * 
 */

const {
  newUser,
  treatMessage,
  disconnect
} = require('./users')


const websocket = (server) => {
  const WebSocket = require('ws')

  const WSServer = new WebSocket.Server({ server })

  WSServer.on('connection', (socket) => {
    newUser(socket)

    socket.on('message', message => {
      console.log(`
socket got ${JSON.stringify(JSON.parse(message), null, " ")}
at ${new Date()}`)

      let data
      try {
        data = JSON.parse(message.toString())
        treatMessage(data)

      } catch {
        if (data) {
          console.log("treatMessage failed")
        } else {
          console.log("message could not be converted to an object")
        }
      }
    })

    socket.on('close', () => {
      disconnect(socket)
    })
  })
}


module.exports = websocket