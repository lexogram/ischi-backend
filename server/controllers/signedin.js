/* controllers/signedin.js */

const { User } = require('../database')


function signedIn(req, res) {
  const { user_id } = req // may also contain organization_id

  let message = {}
  let status = 0

  User.findById(user_id)
    .then(treatSuccess)
    .catch(treatError)
    .finally(proceed)


  function treatSuccess(user) {
    if (user) {
      const { username, email, organization } = user

      message.success = "signed_in",
      message.user = {
        username,
        email,
        organization
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