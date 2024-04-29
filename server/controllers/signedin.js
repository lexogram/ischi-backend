/* controllers/signedin.js */

const { User } = require('../database')


function signedIn(req, res) {
  const { userId } = req

  let message = {}
  let status = 0

  User.findById(userId)
    .then(treatSuccess)
    .catch(treatError)
    .finally(proceed)


  function treatSuccess(user) {
    if (user) {
      const { username, email } = user

      message.success = "signed_in",
      message.user = {
        username,
        email
      }
    } else {
      message.fail = "not-signed-in"
    }
  }


  function treatError(error) {
    status = 500 // Internal Error

    console.log(
      "Error in signedIn:\n",
      JSON.stringify(req.body),
      "\n",
      JSON.stringify(error)
    );

    message.fail = "internal-error"
  }


  function proceed() {
    if (status) {
      res.status(status)
    }

    res.json(message)
  }
}


module.exports = { signedIn }