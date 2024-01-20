/**
 * users.js
 */


const { v4: uuid } = require('uuid')
const {
  addMessageListener,
  removeMessageListener,
  treatMessage
} = require('./messages')
const users = {} // { <uuid>: { socket, user_name }}
const rooms = {} // { <name> : { host_id, members: Set(uuid) }}



const newUser = (socket) => {
  const user_id = uuid()
  console.log(`New connection from: ${user_id}`)
  users[user_id] = { socket }

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
    const uuid = userEntry[0]
    delete users[uuid]

    let user_name = userEntry[1].user_name
    user_name = user_name ? `(${user_name})` : ""
    console.log(`Socket closed for ${uuid}${user_name}`)

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
  } else {
    console.log(`
      ALERT
      No userEntry found for disconnecting user.
      This should never happen.
      `
    )
  }

  // const replacer = (key, value) => {
  //   if (key === "socket") {
  //     return "[ WebServer Socket ]" // too much information
  //   } else if (value instanceof Set) {
  //     return [...value] // sets don't stringify, arrays do
  //   }
  //
  //   return value
  // }
  // console.log("users", JSON.stringify(users, replacer, '  '));
  // console.log("rooms", JSON.stringify(rooms, replacer, '  '));
}


// SENDING MESSAGES // SENDING MESSAGES // SENDING MESSAGES //

const sendMessageToUser = (message) => {
  const { recipient_id } = message
  const { socket } = users[recipient_id]
  message = JSON.stringify(message)
  socket.send(message)
}


const sendMessageToRoom = (message) => {
  let { recipient_id } = message
  // May be array of user_ids or string room name

  if (typeof recipient_id === "string") {
    recipient_id = rooms[recipient_id].members
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


const getUserNameFromId = user_id => {
  return users[user_id].user_name
}


module.exports = {
  newUser,
  disconnect,
  sendMessageToRoom,
  sendMessageToUser,
  getUserNameFromId,
  // Re-export message methods
  addMessageListener,
  removeMessageListener,
  treatMessage
}



// SYSTEM MESSAGES // SYSTEM MESSAGES // SYSTEM MESSAGES //

const treatSystemMessage = ({ subject, sender_id, content }) => {
  switch (subject) {
    case "confirmation":
      console.log(sender_id, content)
      return true // message was handled
    case "set_user_name":
      return setName(sender_id, content)
  }
}


addMessageListener({
  recipient_id: "system",
  callback: treatSystemMessage
})


const setName = (user_id, content) => {
  console.log("user_id, content:", user_id, content);

  const { user_name, last_id } = content

  if (last_id) {const lastData = users[last_id]
    if (lastData) {
      const last_name = lastData.user_name
      if (last_name === user_name) {
        // This user is reconnecting. Remove the temporary user_id
        // from users, and use last_id instead.
        return reconnectUser(last_id, user_id, lastData, content)
      }
    }
  }

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


const reconnectUser = (user_id, temp_id, userData, content) => {
  users[user_id] = userData
  delete users[temp_id]

  const { room, create_room } = content
}


const joinRoom = (user_id, content) => {
  const { user_name, room, create_room } = content
  // Join the room?
  let host_id, members, host, status
  let roomObject = rooms[room]

  if (roomObject) {
    // A room of this name already exists
    ({ host_id, members } = roomObject)
    host = getUserNameFromId(host_id)
  }

  if (create_room) {
    // Try to create a room, if requested
    if (roomObject) {
      status = "create-failed"

    } else {
      members = new Set().add(user_id)
      rooms[room] = roomObject = {
        host_id: user_id,
        members
      }
      status = "created"
      host = user_name
      broadcastMembersToRoom(room)
    }

  } else if (roomObject) {
    members.add(user_id)
    status = "joined"
    broadcastMembersToRoom(room)


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

  return true // message was handled
}


const broadcastMembersToRoom = (room) => {
  let { host_id, members } = rooms[room]

  recipient_id = Array.from(members)
  members = recipient_id.reduce((memberMap, user_id) => {
    memberMap[ user_id ] = getUserNameFromId(user_id)
    return memberMap
  }, {})

  const host = users[host_id]

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