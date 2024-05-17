/**
 * users.js
 */


const { v4: uuid } = require('uuid')
const {
  addMessageListener,
  removeMessageListener,
  treatMessage
} = require('./messages')
const users = {}
// { <uuid>: {
//     socket,      // <object>
//     user_name,   // <Case Sensitive string>
//     munged_name, // <lowercase user_name>
//     choices,     // [ [<emoji>, owners[]], ... ]
//     emoji,       // <emoji>
//     room_counter // <integer)
//   }, ...
// }
const rooms = {} // { <name> : { host_id, members: Set(uuid) }}

const DELETE_USER_DELAY = 2 * 60 * 60 * 1000 // 2 hours



const newUser = (socket) => {
  const user_id = uuid()
  users[user_id] = { socket }

  // logConnectionEvent("connect", user_id)

  const message = JSON.stringify({
    subject: "connection",
    sender_id: "system",
    recipient_id: user_id
  })

  socket.send(message)
}



const disconnect = (socket) => {
  const userEntry = Object.entries(users).find(([uuid, data]) => (
    data.socket === socket
  ))

  if (userEntry) {
    const [ uuid, data ] = userEntry

    // logConnectionEvent("disconnect", uuid, data)

    // The socket is no longer needed...
    delete data.socket

    // ... but don't delete the user yet. Set timeout for 2 hours
    // to give the user time to reconnect and continue from where
    // they left off. The restoreUserId() function will clear this
    // timeout.
    data.deleteTimeout = setTimeout(
      deleteUserData
    , DELETE_USER_DELAY
    , uuid
    )
  } else {
    console.log(`
      ALERT
      No userEntry found for disconnecting user.
      This should never happen.
      `
    )
  }
}



const deleteUserData = uuid => {
  // console.log(`At ${new Date().toLocaleString()}: deleting entry for user ${uuid}`)

  delete users[uuid]

  Object.entries(rooms).forEach(([name, data]) => {
    const { members, host_id } = data

    if (members.has(uuid)) {
      members.delete(uuid)

      if (members.size) {
        if (host_id === uuid) {
          // The departing member is host. transfer hostship
          // to the longest-serving member
          data.host_id = members.values().next().value
        }
        broadcastMembersToRoom(name)

      } else {
        // There's no-one left
        delete rooms[name]
      }
    }
  })
}


// SENDING MESSAGES // SENDING MESSAGES // SENDING MESSAGES //

const sendMessageToUser = (message) => {
  const replacer = (key, value) => {
    if (key === "choices" || key === "emojis") {
      return `Array(${value.length})`
    }
    return value
  }
  // console.log(`sendMessageToUser${JSON.stringify(message, replacer, 2)}`)

  const { recipient_id } = message
  const { socket } = users[recipient_id]
  message = JSON.stringify(message)
  socket.send(message)
}


const sendMessageToRoom = (message) => {
  // console.log(`sendMessageToRoom${JSON.stringify(message, null, 2)}`)
  let { recipient_id } = message
  // May be array of user_ids or string room name

  if (typeof recipient_id === "string") {
    // A room may be deleted while a game is in progress
    recipient_id = rooms[recipient_id]?.members
  }
  if (recipient_id instanceof Set) {
    recipient_id = Array.from(recipient_id)
  }
  if (!Array.isArray(recipient_id)) {
    return console.log(`Cannot send message to room ${message.recipient_id}`, message)
  }

  try {
    message = JSON.stringify(message)
    recipient_id.forEach( user_id => {
      const { socket } = users[user_id]
      socket.send(message)
    })
  } catch (error) {
    const entries = Object.entries(message)
    message = entries.reduce((string, [key, value]) => {
      if (typeof value === "object" && !Array.isArray(value)) {
        value = Object.keys(value).join(", ")
      }
      string += `
      ${key}: ${value}`
      return string
    }, "")
    console.log(`###############
    Failed to send message ${message}
    ${error}
    ###############`)
  }
}


const getUserFromId = user_id => {
  return users[user_id]
}


const getUserNameFromId = user_id => {
  return users[user_id].user_name
}


module.exports = {
  users, // for emojis
  newUser,
  disconnect,
  sendMessageToRoom,
  sendMessageToUser,
  getUserFromId,
  getUserNameFromId,
  // Re-export message methods
  addMessageListener,
  removeMessageListener,
  treatMessage,
  // For Event
  joinRoom,
  leaveRoom
}



// SYSTEM MESSAGES // SYSTEM MESSAGES // SYSTEM MESSAGES //

const treatSystemMessage = ({ subject, sender_id, content }) => {
  // console.log(`\nSystem message received
  // sender: ${sender_id}
  // subject: ${subject}
  // content: ${JSON.stringify(content, null, 2)}
  // `)

  switch (subject) {
    case "restore_user_id":
      return restoreUserId(sender_id, content) // last_id
    case "confirmation":
      // console.log(sender_id, content)
      return true // message was handled
    case "get_existing_room":
      return getExistingRoom(sender_id, content)
    case "send_user_to_room":
      return sendUserToRoom(sender_id, content)
    case "leave_room":
      return leaveRoom(sender_id, content)
  }
}


addMessageListener({
  recipient_id: "system",
  callback: treatSystemMessage
})


const logConnectionEvent = (event, user_id, userData, more) => {
  const message = (() => {
    const padding = 10 - event.length
    return `${event} for${" ".repeat(padding)}`
  })()
  let name = userData?.user_name || userData?.name
  name = name ? ` (${name})` : ""

  const time = new Date().toLocaleString()
  more = more ? `\n                       ${more}` : ""
  console.log(
    `${time}: ${message} ${user_id}${name}${more}`
  )
}



/** The client logged in previously and was given a user_id. If
 *  the server has not been restarted since, then their data may
 *  still be available for this re-connection
 *
 * @param {*} temp_id
 * @param {*} last_id
 * @returns {boolean}
 */
const restoreUserId = (temp_id, last_id) => {
  // data for user[last_id] may have been cleared, so fall back
  // to continuing with the new connection data with the old id

  let userData = users[last_id] // [ <uuid>, { deleteTimeout }]
  let more = ""
  if (userData) {
    clearTimeout(userData.deleteTimeout)
    delete userData.deleteTimeout
    // Use temp's socket to replace the deleted socket
    userData.socket = users[temp_id].socket
    userData.dataNotRestored = false
    more = `(deleted: temp ${temp_id})`

  } else { // adopt last_id but continue with userData for temp
    userData = users[temp_id]
    users[last_id] = userData
    userData.dataNotRestored = true
    more = `(previous data no longer available)`
  }

  delete users[temp_id]

  // logConnectionEvent("reconnect", last_id, userData, more)

  const content = { ...userData } // may only contain socket
  delete content.socket // not needed on the client


  const message = {
    sender_id: "system",
    recipient_id: last_id,
    subject: "user_id_restored",
    content
  }

  sendMessageToUser(message)

  return true // message was handled
}


const sendUserToRoom = (user_id, content) => {
  // console.log("user_id, content:", user_id, content);

  const { user_name } = content


  // Ignore password for now
  const userData = users[user_id]
  if (!userData) {
    console.log(
      `!userData for ${user_id}! This should never happen!`
    )
    return false // message was _not_ handled
  }

  // Give a name to this user_id
  userData.user_name = user_name
  joinRoom(user_id, content)
}


const getExistingRoom = (sender_id, room) => {
  // Accept room case-insensitively but return original name
  const content = Object.keys(rooms).find( roomName => (
    roomName.toLowerCase() === room.toLowerCase()
  )) // original name of room or undefined

  const message = {
    recipient_id: sender_id,
    sender_id: "system",
    subject: "existing_room",
    content
  }

  sendMessageToUser(message)

  return true // message handled
}


function joinRoom(user_id, content) {
  // console.log(`joinRoom(${user_id}, ${JSON.stringify(content, null, 2)})
  // name:`, users[user_id].user_name);

  const { user_name, room, create_room } = content

  // Join the room?
  let host_id, members, host, status, error
  let roomObject = rooms[room]

  if (roomObject) {
    // A room of this name already exists
    ({ host_id, host, members } = roomObject)
    // console.log("request to joinRoom:", roomObject);
  }

  if (create_room) {
    // Try to create a room, if requested
    if (roomObject) {
      if (user_id === host_id) {
        // The host is logging back in after a disconnection
        // Set no status

      } else {
        error = true
        status = "create-failed"
      }

    } else { // no roomObject yet, with a request to create one
      host = user_name
      members = new Set()
      rooms[room] = roomObject = {
        host_id: user_id,
        host,
        members
      }

      status = "created"
    }
  }

  const roomAvailable = roomObject && !error

  if (roomAvailable) {
    members.add(user_id)
    status = status || "joined"

    // Set room in users[user_id], to send it on reconnection
    const userData = users[user_id]
    userData.room = room

  } else {
    // The room does not yet exist, and there was no request to
    // create it.
    status = "join-failed"
  }

  content = { status, user_name, room, host }

  // Reply
  const message = {
    sender_id: "system",
    recipient_id: user_id,
    subject: "room_joined",
    content
  }

  sendMessageToUser(message)

  if (roomAvailable) {
    broadcastMembersToRoom(room)
  }

  return true // message was handled
}


function leaveRoom( sender_id, { room } ) {
  // console.log(`leaveRoom(${sender_id}, ${room})`)
  // console.log("users[sender_id].user_name:", users[sender_id].user_name);

  const roomData = rooms[room]
  if (!roomData) {
    // TODO: send a message to the confused user
    return // not handled
  }

  // console.log("roomData:", roomData);
  // {
  //   host_id: '74c43c6f-17dc-4f1f-8c8d-d97f2d639cda',
  //   host: '😉_wink',
  //   members: Set(1)
  // }

  const { members } = roomData

  showUserOut(room, members, sender_id)

  // Respond to the specific user who left (who may be the host
  sendMessageToUser({
    sender_id: "system",
    recipient_id: sender_id,
    subject: "left_room",
    content: { room }
  })

  return members.size || true // true if the last member left
}



const showUserOut = (room, members, sender_id) => {
  members.delete(sender_id)

  const userData = users[sender_id]
  const { user_name } = userData

  if (members.size) {
    // Tell other members of the room who has left and who is left
    sendMessageToRoom({
      sender_id: "system",
      recipient_id: room,
      subject: "user_left_room",
      content: { sender_id, user_name }
    })
  
    broadcastMembersToRoom(room)

  } else {
    // There's no-one left. Close the room.
    delete rooms[room]
  }

  if (userData.room === room) {
    delete userData.room
  }
}


const broadcastMembersToRoom = (room) => {
  let { host_id, host, members } = rooms[room]

  const recipient_id = Array.from(members)
  members = recipient_id.reduce((memberMap, user_id) => {
    memberMap[ user_id ] = getUserNameFromId(user_id)
    return memberMap
  }, {})

  const content = {
    room,
    members,
    host,
    host_id
  }

  const message = {
    sender_id: "system",
    recipient_id,
    subject: "room_members",
    content
  }

  sendMessageToRoom(message)
}