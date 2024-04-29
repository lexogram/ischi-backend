/**
 * server/controllers/signout.js
 */


function signOut(req, res) {
  let status = 0
  let message = {}

  try {
    req.session = null
    message.success = "Signed out."

  } catch(error) {
    status = 400
    console.log("signOut error:", req.body, error);
    message.fail = "Sign Out Error"
  }

  if (status) {
    res.status(status)
  }

  res.json(message)
}


module.exports = {
  signOut
}