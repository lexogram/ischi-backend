/**
 * server/controllers/signup.js
 */


const bcrypt = require('bcryptjs')
const { User } = require('../database')
const { getOrg } = require('./organization')



function signUp(req, res) {
  let {
    username,
    organization,
    organization_id,
    email,
    password
  } = req.body


  if (organization  && !organization_id) {
    // If an Organization with a name like this exists, get the
    // original version of the name and its _id, and call this
    // function recursively.
    const callback = (error, record) => {
      if (record) {
        const { name, _id } = record
        if (_id) {
          // Recursive call
          req.body.organization = name
          req.body.organization_id = _id
          signUp(req, res)

        } else {
          treatError(
            `organization_id not found for ${organization}`
          )
        }

      } else {
        treatError(error)
      }
    }

    return getOrg(organization, callback)
  }


  const hash = bcrypt.hashSync(password, 8)
  const userData = organization
    ? { username, organization, organization_id, email, hash }
    : { username, email, hash }


  let message = {}


  new User(userData)
    .save()
    .then(treatSuccess)
    .catch(treatError)
    .finally(proceed)

  function treatSuccess(user) {
    const { username, email } = user
    message.success = "User record created",
    message.user = {
      username,
      email
    }
  }


  function treatError(error) {
    console.log("signUp error:", req.body, error);

    message.fail = `User for "${username}" not saved`
  }


  function proceed () {
    res.json(message)
  }
}


module.exports = {
  signUp
}
