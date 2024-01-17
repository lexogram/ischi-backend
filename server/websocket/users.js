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
const groups = {} // { <name> : { owner_id, members: Set(uuid) }}



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

    Object.entries(groups).forEach(([name, data]) => {
      const { members, owner_id } = data

      if (members.has(uuid)) {
        members.delete(uuid)

        if (members.size) {
          if (owner_id === uuid) {
            // The departing member is owner. transfer ownership
            // to the longest-serving member
            data.owner_id = members.values().next().value
          }
          broadcastMembersToGroup(name)

        } else {
          // There's no-one left
          delete groups[name]
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
  // console.log("groups", JSON.stringify(groups, replacer, '  '));
}


// SENDING MESSAGES // SENDING MESSAGES // SENDING MESSAGES //

const sendMessageToUser = (message) => {
  const { recipient_id } = message
  const { socket } = users[recipient_id]
  message = JSON.stringify(message)
  socket.send(message)
}


const sendMessageToGroup = (message) => {
  let { recipient_id } = message
  // May be array of user_ids or string group name

  if (typeof recipient_id === "string") {
    recipient_id = groups[recipient_id].members
  }
  if (recipient_id instanceof Set) {
    recipient_id = Array.from(recipient_id)
  }
  if (!Array.isArray(recipient_id)) {
    return console.log(`Cannot send message to group ${message.recipient_id}`, message)
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
  sendMessageToGroup,
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
    case "join_group":
      return joinGroup(sender_id, content)
  }
}


addMessageListener({
  recipient_id: "system",
  callback: treatSystemMessage
})


const joinGroup = (user_id, content) => {
  console.log("user_id, content:", user_id, content);

  const { user_name, group_name, create_group } = content
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

  // Join the group?
  let owner_id, members, owner, status
  let groupObject = groups[group_name]

  if (groupObject) {
    // A group of this name already exists
    ({ owner_id, members } = groupObject)
    owner = getUserNameFromId(owner_id)
  }

  if (create_group) {
    // Try to create a group, if requested
    if (groupObject) {
      status = "create-failed"

    } else {
      members = new Set().add(user_id)
      groups[group_name] = groupObject = {
        owner_id: user_id,
        members
      }
      status = "created"
      owner = user_name
      broadcastMembersToGroup(group_name)
    }

  } else if (groupObject) {
    members.add(user_id)
    status = "joined"
    broadcastMembersToGroup(group_name)


  } else {
    // The group does not yet exist, and there was no request to
    // create it.
    status = "join-failed"
  }

  content = { status, user_name, group_name, owner }

  // Reply
  const message = {
    sender_id: "system",
    recipient_id: user_id,
    subject: "group_joined",
    content
  }

  sendMessageToUser(message)

  return true // message was handled
}


const broadcastMembersToGroup = (group_name) => {
  let { owner_id, members } = groups[group_name]

  recipient_id = Array.from(members)
  members = recipient_id.reduce((memberMap, user_id) => {
    memberMap[ user_id ] = getUserNameFromId(user_id)
    return memberMap
  }, {})

  const owner = users[owner_id]

  const content = {
    group_name,
    members,
    owner,
    owner_id
  }

  const message = {
    sender_id: "system",
    recipient_id,
    subject: "group_members",
    content
  }

  sendMessageToGroup(message)
}