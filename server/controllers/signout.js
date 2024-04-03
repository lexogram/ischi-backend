/**
 * server/controllers/signout.js
 */


function signOut(req, res) {
  let status = 0
  let message

  try {
    req.session = null
    message = { success: "Signed out." }

  } catch(error) {
    message = error
  }

  if (status) {
    res.status(status)
  }

  res.send(message)
}


module.exports = {
  signOut
}