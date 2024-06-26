/**
 * server/game/index.js
 */

const GAME = "game"


const {
  addMessageListener,
  // removeMessageListener,
  sendMessageToUser,
  sendMessageToRoom,
  getUserFromId,
  getUserNameFromId,
  // For Event:
  joinRoom,
  leaveRoom
} = require("../websocket/users");
const publicPath = "../../public/ischi/"
const { shuffle } = require('../utilities/shuffle')


const ischiData = {}
/*  { <room>: {
        votes: {
          <pack_name>: [ <user_id>, ... ],
          ...
        },
        gameData: {
          <read from /<pack_name>/index.json>
        }
      }
    }
*/


const treatGameMessages = (messageData) => {
  // console.log("messageData:", messageData);

  switch (messageData.subject) {
    // case "send_user_to_room": // called directly from treatMessage
    //   return setUserNameAndRoom(messageData)
    case "vote":
      return treatVote(messageData)
    case "select_pack":
      return selectPack(messageData)
    case "match":
      return scoreMatch(messageData)
    case "request_next_card":
      return requestNextCard(messageData)

    // EVENTS //

    case "create_event_room":
      return createEventRoom(messageData)
    case "start_event_game":
      return startEventGame(messageData)
    case "leave_event_game":
      return leaveEventGame(messageData)
    case "end_event_game":
      return endEventGame(messageData)
  }

  return false // not handled
}


const setUserNameAndRoom = ({ sender_id, content }) => {
  const { room } = content
  const roomData = ischiData[room]
                || (ischiData[room] = {})
  const { votes, gameData } = roomData

  if (votes) {
    const message = {
      sender_id: GAME,
      recipient_id: sender_id,
      subject: "votes",
      content: anonymizeVotes(votes)
    }

    sendMessageToUser(message)
  }

  if (gameData) {
    const message = {
      sender_id: GAME,
      recipient_id: sender_id,
      subject: "gameData",
      content: gameData
    }

    sendMessageToUser(message)
  }

  return true // message was handled
}


const anonymizeVotes = votes => {
  const votesCast = Object.entries(votes)
  return votesCast.reduce((votesCast, [ pack, votes ]) => {
    votesCast[pack] = votes.length
    return votesCast
  }, {})
}


const treatVote = ({ sender_id, content }) => {
  const { room, pack_name } = content

  // Find the votes cast by members of room room
  const roomData = ischiData[room]
                || (ischiData[room] = {})
  const votes     = roomData["votes"]
                || (roomData["votes"] = {})

  // Remove any existing votes cast by sender_id
  Object.values(votes).some( votes => {
    const index = votes.indexOf(sender_id)
    if (index !== -1) {
      votes.splice(index, 1)
      return true
    }
  })

  // Cast this (new) vote by sender_id
  const packVotes = votes[pack_name]
                || (votes[pack_name] = [])
  packVotes.push(sender_id)

  content = anonymizeVotes(votes)

  // Tell all the members of the room about it
  const message = {
    sender_id: GAME,
    recipient_id: room,
    subject: "votes",
    content
  }

  sendMessageToRoom(message)

  return true // message was handled
}


const createGameData = (folder, delay) => {
  // const pack = packData.find(
  //   pack => pack.folder === folder
  // )
  // const { count } = pack
  const gameData = require(`${publicPath}${folder}/index.json`)

  // <<< QUIRK: Firefox (at least) seems to be restoring gameData
  // from cache, including the score from a previous game.
  // Solution: deliberately set gameDate.score to {}
  gameData.score = {}
  gameData.startTime = 0
  gameData.endTime = 0
  // QUIRK >>>

  const { total } = gameData
  // Create an array of the numbers between 0 and count-1...
  const randomIndices = Array
    .from(
      {length: total},
      (_, index) => index
    )
  // ... and shuffle it. This will be the order in which the
  // `count` cards are shown
  shuffle(randomIndices)

  gameData.last = total - 2
  gameData.randomIndices = randomIndices
  gameData.index = 0
  gameData.nextIndex = 1 // so host can click Next Card at start
  gameData.root = `${folder}/images/`
  gameData.delay = delay
  gameData.lastClick = {}
  gameData.createdTime = +new Date()
  // gameData.foundBy = ""
  // gameData.Time = 0

  return gameData
}


const selectPack = ({ content }) => {
  const { room, folder, delay } = content

  const roomData = ischiData[room]
                || (ischiData[room] = {})

  content = createGameData(folder, delay)

  // Save for future room members
  roomData.gameData = content
  // Reset votes
  roomData.votes = {}

  // Send game data to all the members of the room
  const message = {
    sender_id: GAME,
    recipient_id: room,
    subject: "gameData",
    content
  }

  sendMessageToRoom(message)

  return true // message was handled
}


const scoreMatch = ({ sender_id, content }) => {
  const { href, room } = content
  const gameData = ischiData[room].gameData
  const {
    index,
    randomIndices,
    imageSources,
    cardData
  } = gameData

  if (index < 0 || isNaN(index)) {
    // Someone has already found the match, or the game is over.
    // Ignore the incoming message.

  } else {
    // Find the file name of the images that match
    const images1 = cardData[randomIndices[index]]
                    .images
                    .map( image => image.imageIndex)
    const images2 = cardData[randomIndices[index + 1]]
                    .images
                    .map( image => image.imageIndex)
    const imageIndex = images1.find(
      index => images2.indexOf(index) + 1
    )
    const match = imageSources[imageIndex].source

    if (href === match) {
      // User sender_id is the first to find the match
      const data = { gameData, sender_id, room, href }
      acknowledgeMatch(data)
    }

    return true // message was handled
  }
}


const acknowledgeMatch = ({
  gameData,
  sender_id,
  room,
  href
}) => {
  const user_name = getUserNameFromId(sender_id)

  let index = gameData.index + 1
  if (index > gameData.last) {
    index = "game_over"
  }

  // Prevent any other player from claiming the same match
  gameData.index = -1
  // This will be reset after the timeOut call to showNextCard

  // <<< Provide data for a user who joins the game between the
  // moment when a match is found and when the next card is shown
  gameData.foundBy = user_name
  gameData.lastClick = { href, cardIndex: -1 }
  // This will be ignored by any player already playing >>>

  const score = gameData.score
            || (gameData.score = {})
  score[sender_id] = (score[sender_id] || 0) + 1

  const content = {
    href,
    user_name,
    score
  }

  sendMessageToRoom({
    sender_id: "game",
    recipient_id: room,
    subject: "match_found",
    content
  })

  if (isNaN(gameData.delay)) {
    // Wait for the room host to click on Next Card
    gameData.nextIndex = index

  } else {
    setTimeout(
      showNextCard,
      gameData.delay,

      gameData,
      room,
      index
    )
  }
}


const requestNextCard = ({ content: room }) => {
  const gameData = ischiData[room].gameData
  const index = gameData.nextIndex

  showNextCard(gameData, room, index)

  return true // message was handled
}


const showNextCard = (gameData, room, index) => {
  gameData.index = index // integer or "game_over"

  const content = { index }

  if ((index === gameData.last)) {
    // No more cards
    gameData.nextIndex = "game_over"
    gameData.endTime = content.endTime = +new Date()

  } else {
    gameData.nextIndex = content + 1
  }

  // <<< Reset entries in gameData that will be sent to any
  // player who joins the game between now and when the next
  // match is found
  gameData.foundBy = ""
  gameData.lastClick = {}
  // This will be ignored by any player already playing >>>

  // content will be next index to randomIndices or 'game_over'
  sendMessageToRoom({
    sender_id: "game",
    recipient_id: room,
    subject: "show_next_card",
    content
  })
}


addMessageListener([
  // Get _all_ messages addressed to GAME ("game") and also
  // messages addressed to "system" with the "subject"
  // "send_user_to_room". System will treat "send_user_to_room"
  // messages first.
  { recipient_id: GAME, callback: treatGameMessages },
  { subject: "send_user_to_room", callback: setUserNameAndRoom },
])



// EVENTS //

function createEventRoom({ sender_id, content }) {
  // console.log("createEventRoom message:", message);
  // {
  //   recipient_id: 'game',
  //   subject: 'create_event_room',
  //   content: {
  //     organization: 'nevzorovyh',
  //     name: 'Help',
  //     emoji: '⛑️',
  //     folder: '663013af1db981a3f72b2e92/18-19_век'
  //   },
  //   sender_id: 'eeb37e55-1798-4a82-8af2-4cadfbb76f1e'
  // }

  const {
    organization,
    name,
    emoji,
    folder,
    delay=2000 // 500
  } = content

  const user = getUserFromId(sender_id)
  const counter = (user.room_counter || 0) + 1
  user.room_counter = counter

  const player = `${emoji}_${name}`
  const roomHost = `${player}_${counter}`
  const room = `/${organization}/${roomHost}`
  // Must match expression used in setParams in Event Routes:
  //  setRoomHost(`/${organization}/${room_host}`)
  
  const gameData = createGameData(folder, delay)
  // gameData.last = total - 2
  // gameData.randomIndices = randomIndices
  // gameData.index = 0
  // gameData.nextIndex = 1
  // gameData.root = `${folder}/images/`
  // gameData.delay = delay
  // gameData.lastClick = {}

  const roomData = { gameData }

  ischiData[room] = roomData

  content = {
    folder,
    room,
    gameData
  }

  sendMessageToUser({
    sender_id: GAME,
    recipient_id: sender_id,
    subject: "event_room_created",
    content
  })

  // Move the room host to the user room that has just opened
  joinRoom(
    sender_id, { user_name: player, room, create_room: true }
  )
  // Will send a second message
  // const message = {
  //   sender_id: "system",
  //   recipient_id: sender_id,
  //   subject: "room_joined",
  //   content: {
  //     status: "created"|"joined",
  //     user_name: player,
  //     room,
  //     host: player
  //   }
  // }

  return true // handled message
}


function startEventGame({ content }) {
  const { room } = content

  // Set startTime, and save it in the roomData...
  const startTime = +new Date()
  const { gameData } = ischiData[room]
  gameData.startTime = startTime

  // ... and send it to the users in the room
  content.startTime = startTime

  sendMessageToRoom({
    recipient_id: room,
    subject: "event_game_started",
    content
  })

  return true // message handled
}


function leaveEventGame({ sender_id, content }) {
  const { room } = content
  const roomData = ischiData[room]

  if (!roomData) {
    // TODO: send an explanation to the confused user
    return
  }

  sendMessageToUser({
    sender_id: GAME,
    recipient_id: sender_id,
    subject: "left_game",
    content: { room }
  })

  // Remove the user from the members set and delete
  // the room field from their users data
  const playersLeft = leaveRoom(sender_id, content)
  // Will be true if the last player left, or an integer number
  // of players remaining.

  // All users will receive a "user_left_room" message
  // from "system". The user will receive a "left_room"
  // message from system.

  if (playersLeft === true) {
    delete ischiData[room]

  } else {
    // Tell the other players which player has left
    sendMessageToRoom({
      sender_id: GAME,
      recipient_id: room,
      subject: "user_left_game",
      content: { room, sender_id }
    })
  }

  return true
}


function endEventGame({ sender_id, content }) {
  const { room } = content
  const roomData = ischiData[room]

  if (!roomData) {
    // TODO: send an explanation to the confused user
    return
  }

  delete ischiData[room]

  // Tell the client Games that the game has ended...
  // while the room still exists
  sendMessageToRoom({
    sender_id: GAME,
    recipient_id: room,
    subject: "game_ended_by_host",
    content: { room }
  })

  // This can only be called by the room host, and the
  // departure of the room host will close the room.
  return leaveRoom(sender_id, content)
  // All users will receive a "room_closing" message
}