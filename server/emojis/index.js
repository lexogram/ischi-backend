/**
 * src/WSSimulator.js
 */


const EMOJIS = "emojis"


const {
  users,
  // { <uuid>: {
  //     socket,      // <object>
  //     user_name,   // <Case Sensitive string>
  //     munged_name, // <lowercase user_name>
  //     choices,     // [ [<emoji>, owners[]], ... ]
  //     emoji        // <emoji>
  //   }, ...
  // }
  addMessageListener,
  // removeMessageListener,
  sendMessageToUser
} = require("../websocket/users");
const { shuffle } = require('../utilities/shuffle')
const allEmojis = require('./emojis.json')



const taken = {} // { emoji: <owners with different names>[] }
let shortfall = false // will remain false until there are 
// fewer than 25 emojis that have not been claimed.



/** Calleb by getRandomEmojis() and pushSwapsToClients()
 *
 * @returns {nested array} [ [<emoji>, []], ... ]
 */
const getNeverClaimed = () => {
  const claimed = Object.keys(taken) // array of emojis
  return allEmojis
   .filter( emoji => claimed.indexOf(emoji) < 0)
   .map( emoji => [ emoji, [] ])
}


const getOwnerNames = emoji => {
  return taken[emoji] || []
}


// <<< SORT FUNCTIONS
// Called with two arrays with the format
//   [ <emoji>: <owner names>[] ]
const byNumberOfOwners = ([, aOwners], [, bOwners]) => {
  return aOwners.length - bOwners.length
}


const byEmoji = (a, b) => {
  const [aEmoji] = a
  const [bEmoji] = b
  return aEmoji > bEmoji ? 1 : (aEmoji === bEmoji ? 0 : -1)
}
// SORT FUNCTIONS >>>



/** Called by getRandomEmojis()
 *
 * @param {integer} count  is the number of pre-claimed emojis
 *                         that are required if a full 25 options
 *                         are to be returned
 * @returns {nested array} [ [<emoji>, <munged_name>[]], ... ]
 */
const getCopies = (count) => {
  // Create an array with the format...
  // [ [<emoji>, [<owner>, ...]], ... ]
  let copies = Object.entries(taken)
  // ... randomize the order of the items then...
  shuffle(copies)
    // ... ensure that the items with more owners are placed 
    // nearer the end of the array
    .sort(byNumberOfOwners)
    // ... and choose the first `count` items in this array
  return copies.slice(0, count)
}


/** Called by client before the user has entered a name, via
 *  simulateCallToWS()
 *
 * @param {string} id:     unique id for this new user
 * @param {object} result: will be given an `emojis` field which
 *                 is an array of (probably) unclaimed emojis in
 *                 the format [ [ <emoji>: <munged_name>[] ], ...]
 */
const getRandomEmojis = ( id, result ) => {
  // Use as many unclaimed emojis as possible.
  // [ [<emoji>: owners[]], ...]
  let choices = getNeverClaimed()

  if (shortfall) {
    // Almost every emoji has been claimed. Randomly add some
    // emojis which cannot be used with certain names.
    const copies = getCopies(shortfall)
    choices = [ ...choices, ...copies ]
    // The owner names array in any copies will not be empty
  }

  // Choose a random selection of 25 emojis+owners...
  shuffle(choices)
  choices = (choices).slice(0, 25)
  // ... and arrange them in a predictable order
  choices.sort(byEmoji)

  users[id].choices = choices
  result.emojis = choices
}


const checkIfEmojiIsTaken = (id, { name, emoji }, result) => {
  const munged_name = name.toLowerCase()
  const userData = users[id]

  userData.name = name // respects case
  userData.munged_name = munged_name // for inter-user comparisons
  userData.user_name = `${emoji}_${name}` 
  const ownerNames = getOwnerNames(emoji)

  if (ownerNames.length) {
    result.taken = true // Another owner exists. Be strict...
  
    if (shortfall) {
      // ... but there are not enough emojis for everyone to have
      // a unique emoji...
      if (ownerNames.indexOf(munged_name) < 0) {
        // ... *and* although this emoji _is_ taken, none of its
        // owners has the same name as the current user. So
        // be more lenient.

        result.taken = ownerNames
      }
    }

  } else {
    result.taken = false // no-one has claimed this name... yet
  }

  if (!result.taken) {
    userData.selected = emoji
  }
}


const confirmNameAndEmoji = (id, { name, emoji }, result) => {
  // Update the user's data
  const userData = users[id]
  const munged_name = name.toLowerCase()
  userData.name = name
  userData.munged_name = munged_name
  userData.user_name = `${emoji}_${name}`

  const owners = getOwnerNames(emoji)
  // If owners is empty, then all is good
  const empty = !owners.length
  let confirmed = empty

  if (!confirmed && shortfall) {
    // There are less than 25 emojis that have not been claimed,
    // so the emoji _can_ be used if `munged_name` is not the same
    // as that of any other user who has selected this emoji.

    confirmed = owners.indexOf(munged_name) < 0
  }

  if (confirmed) {
    if (empty) {
      taken[emoji] = owners
    }
    owners.push(munged_name)
    userData.choices.length = 0 // the others are no longer needed
    userData.emoji = emoji
    // The user will no longer be able to change userData.name

    pushSwapsToClients(id, munged_name, emoji)
  } 

  result.confirmed = confirmed
}


function pushSwapsToClients(owner_id, munged_owner, emoji) {
  // Check if other registering users have this emoji as an option
  const swaps = []

  // Treat only other users who could choose emoji to register
  const active = Object.entries(users).filter(([ id, data ]) => (
       id !== owner_id // This isn't the user taking ownership...
    && data.choices?.length // ... and they haven't yet registered
    // NOTE: data.choices will be [] if this user is confirmed
    // It will be undefined if a user connected and then
    // disconnected without registering ... and the garbage hasn't
    // been cleaned up yet.
  ))

  const unused = getNeverClaimed() // [ [<emoji>, []], ... ]
  shortfall = Math.max(0, 25 - unused.length)
  // 0 (false) or the shortfall to be filled

  active.forEach(([ id, { munged_name, choices, selected } ]) => {
    if ( selected === emoji
      && munged_name !== munged_owner
      && shortfall
    ) {
      // It's ok to leave the current selection, because there
      // aren't enough free emojis and the owner's name is
      // different

    } else {
      // Either the owner's name is the same, or this emoji is
      // not currently selected or there are more emojis to choose
      // from. Find an alternative.
      const index = choices.findIndex(choice => (
        choice[0] === emoji
      ))
      if (index > -1) {
        // This user has `emoji` as a possible choices. Add a 
        // `replacement` emoji to a swap array to add to swaps
        const swap = { id, emoji, index }  
        getReplacementEmoji(munged_name, choices, unused, swap)
        swaps.push(swap)
      }
    }
  })

  if (swaps.length) {
    broadcast(swaps)
  }
}



/** Called by pushSwapsToClients(). Adds a `replacement` emoji
 *  to swap, if one is available.
 *
 * @param {array}  emojis:   array of emojis user has been offered
 * @param {string} username: user's current name (may change)
 * @param {array}  unused:   [ [<emoji>, owners[]], ... ]
 * @param {object} swap:     { id, emoji, index }
 */
const getReplacementEmoji = (username, choices, unused, swap) => {
  if (shortfall) {
    // There are not enough unclaimed emojis to offer one that no-
    // one else has taken. Switch to shortfall mode (if that
    // didn't happen earlier). Offer the confirmed emoji used by
    // a random user who has a different name. 
    const usersEntries = Object.values(users)
    // { choices, name, munged_name [, emoji] }
    shuffle(usersEntries) // shuffle array of users' emojis

    usersEntries.some(({ munged_name, emoji }) => {
      if (emoji && munged_name !== username) {
        // User <munged_name> has registered a chosen emoji and a
        // different name, so their registeredemoji can be used by
        // user <username> ... unless <username> is changed to
        // match <munged_name> in the future
        swap.replacement = [ emoji, taken[emoji] ]
        return true // stop looking
      }
    })

    // The return value of .some will be false if:
    // * There aren't any registered users (no .emoji)
    // * Every other registerd user has the name <username>
    // In this case, there will be no replacement offered.

  } else {
    // Find a random emoji in unused that is not in emojis
    shuffle(unused)
    unused.some(( replacement, index, array ) => {
      const found = choices.find(choice => (
        choice[0] === replacement[0]
      ))
      if (!found) {
        swap.replacement = replacement
        return true // stop looking
      }
    })
  }

  // Update the local record of emojis to choose from
  choices.splice(swap.index, 1, swap.replacement) // undefined?
}


function broadcast(swaps) {
  // Inform the other users that `emoji` needs to be swapped
  swaps.forEach( swap => {
    // swap is { id, emoji, index, replacement }  
    const message = {
      sender_id: EMOJIS,
      recipient_id: swap.id,
      subject: "swap",
      content: swap
    }
  
    sendMessageToUser(message)
  })
}


const callback = ({ sender_id, subject, content }) => {
  // recipient_id will be "emojis"
  // content may be:
  // * { id }              // subject: "emojis"
  // * { id, name, emoji } // subject: "check" | "confirm"

  const result = {}
  let handled = false

  // Do the requested action immediately, but delay the callback
  switch (subject) {
    case "emojis":
      getRandomEmojis(sender_id, result)
      handled = true
      break
    case "check":
      checkIfEmojiIsTaken(sender_id, content, result)
      handled = true
      break
    case "confirm":
      confirmNameAndEmoji(sender_id, content, result)
      handled = true
      break
  }

  const message = {
    sender_id: EMOJIS,
    recipient_id: sender_id,
    subject,
    content: result
  }

  sendMessageToUser(message)

  return handled
}


addMessageListener({ recipient_id: EMOJIS, callback })