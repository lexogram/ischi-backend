/**
 * server/websocket/messages.js
 */


const messageListeners = {
  subject: {},
  recipient_id: {}
} // { <topic>: { <subject>: [<function>, ...], ... }, ... }



/**
 * Allow functions from other scripts to listen for incoming
 * messages.
 * Messages with a recipient_id of "system" will be treated
 * separately, regardless of their subject
 *
 * Listeners can subscribe to either...
 * - All messages with a given subject (e.g. "make_move")
 * or:
 * - All messages with a given recipient_id (e.g. "xo_game")
 */
const addMessageListener = (listener) => {
  // Allow multiple listeners to be added with one call
  if (Array.isArray(listener)) {
    return listener.forEach( listener => {
      addMessageListener(listener)
    })
  }

  treatMessageListener("add", listener)
}


const removeMessageListener = (listener) => {
  // Allow multiple listeners to be removed with one call
  if (Array.isArray(listener)) {
    return listener.forEach( listener => {
      removeMessageListener(listener)
    })
  }

  treatMessageListener("remove", listener)
}


const treatMessageListener = (action, listener) => {
  if (typeof listener === "object") {
    const {subject, recipient_id, callback} = listener

    if (callback instanceof Function) {
      const [ category, topic ] = subject
        ? [ messageListeners.subject, subject ]
        : recipient_id
          ? [ messageListeners.recipient_id, recipient_id ]
          : [] // neither subject nor recipient_id

      if (category) {
        const listeners = category[topic]
                      || (category[topic] = new Set())
        listeners[action](callback)

        // console.log(
        //   `MessageListener successfully ${action}ed\n`, listener
        // );
        // console.log("messageListeners:", messageListeners);
        return 0 // no error
      }
    }
  }

  // callback is not a function, or neither subject nor
  // recipient_id provided
  console.log(`ERROR from ${action}MessageListener:`, listener);
}


const treatMessage = (message) => {
  const {
    subject,
    recipient_id
  } = message
  // console.log("New message:", message);
  let handled = false

  // The same message can be handled twice.
  // Once for its recipient (treat messages to "system" first)...
  let listeners = Array.from(
    messageListeners.recipient_id[recipient_id] || []
  )
  handled = listeners.some( listener => listener( message ))

  // ... and once for its subject
  listeners = Array.from(messageListeners.subject[subject] || [])
  handled = listeners.some( listener => listener( message ))
         || handled

  if (!handled) {
    console.log("Unhandled message:", message);
  }
}


module.exports = {
  addMessageListener,
  removeMessageListener,
  treatMessage
}