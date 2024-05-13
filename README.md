# BACKEND FOR A MULTIPLAYER GAME #

Demo of using WebSocket to run a muliple-user app with private rooms.

[Not much to see in a browser.](https://player-backend-o5aj.onrender.com/)

Hosted on a free plan at [render.com](https://render.com/).

You can find the frontend [here](https://github.com/lexogram/ischi).

## messages
Provides a way for other scripts to listen for particular
messages: by recipient_id or by subject. Logs any message where no function is called or the function that is called does not
return a truthy value.

## users
Treats incoming connection and disconnection messages.

Attributes a unique user_id to each connecting user. May revert to using a previous id (last_id) if requested to do so.

Data for users is stored in a `users` object, with the format:
```
{ <unique user id>: {
    socket,      // <object: always present>
    +
    user_name,   // <Case Sensitive string>
    munged_name, // <lowercase user_name>
    choices,     // [ [<emoji>, owners[]], ... ]
    emoji        // <emoji>
  }, ...
}
```
The munged_name, choices and emoji fields can be used to 
give users a humanly readable unique name. This means that
user_name does not have to be unique.

Manages rooms. Rooms allow you to run different activities from the same server. You can create a "Scrabble" room for a scrabble game and a "Memory" room for a memory game. Clients in a given room can send messages to the whole room, for example to share the user_ids of all logged-in members.

There may also be sub-rooms within a game, for all the players at a specific table, for instance.

`rooms` has the structure:
```
{ <room name>: {
  host_id: <user_id of user who created or controls room>,
  members: <Set of member's user_id's (including host_id)>
}}
```

Exports `sendMessageToUser()` and `sendMessageToRoom()` functions, as well as `getUserNameFromId()`, plus other admin functions.

## emojis

## games

When a message with the subject "send_user_to_room" is sent to "system", it may be handled both by the `users` script and by a game script.

The game script will receive it after the System has dealt with it. The game will have to call `addMessageListener()` in the `messages` script directly, in order to receive callbacks for it.

