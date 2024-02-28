/**
 * websocket.js
 * 
 */

const WebSocket = require('ws')
const {
  newUser,
  treatMessage,
  disconnect
} = require('./users')



const websocket = (server) => {
  const WSServer = new WebSocket.Server({ server })

  WSServer.on('connection', (socket) => {
    let pingInterval
    newUser(socket)

    socket.on('message', message => {
//       console.log(`
// socket got ${JSON.stringify(JSON.parse(message), null, " ")}
// at ${new Date()}`)

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
      clearInterval(pingInterval)
    })

    socket.on('pong', () => console.log("pong", new Date()))


    const sendPing = () => {
      socket.ping()
    }


    pingInterval = setInterval(sendPing, 30000)
  })
}


module.exports = websocket