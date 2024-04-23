/**
 * server/controllers/setPack.js
 */

const { Pack } = require('../database')


function setPack(req, res) {
  let status = 0
  let message = {}

  const formData = req.body


  new Pack(formData)
    .save()
    .then(treatResult)
    .catch(treatError)
    .finally(proceed)


  function treatResult(pack) {
    const { name,
      count,
      owner_type,
      owner_id
    } = pack
    message.success = "Pack record created",
    message.pack = {
      name,
      count,
      owner_type,
      owner_id
    }
  }


  function treatError(error) {
    console.log("Error in treatQuery():", error);
    status = 500
    const stringQuery = JSON.stringify(formData)
    message.fail = `Internal error treating query ${stringQuery}`
  }


  function proceed() {
    if (status) {
      res.status(status)
    }

    res.json(message)
  }

}


module.exports = {
  setPack
}