/**
 * server/controllers/getOwnedPacks.js
 */

const { Pack } = require("../database")


function getOwnedPacks(req, res) {
  let status = 0
  let message = {}

  const { user_id, organization_id, body } = req
  let query = body?.query || { owner_type: "Sampler" }

  const request = organization_id
   ? {$or: [
       { owner_id: organization_id },
       query
     ]}
   : user_id
      ? {$or: [
          { owner_id: user_id },
          { owner_type: "Sampler" }
        ]}
      : query

  Pack
    .find(request)
    .sort({ owner_type: 1 }) // Sampler comes after Orgⁿ and User
    .then(treatResult)
    .catch(treatError)
    .finally(proceed)


  function treatResult(packs) {
    const length = packs.length
    if (!length) {
      status = 404 // Not Found
      message.fail = `No packs found`

    } else {
      const plural = length !== 1
      message.success = `Found ${length} pack${plural ? "s" : ""}`
      message.packs = packs.map( pack => (
        {
          name:       pack.name,
          folder:     pack.folder,
          thumbnail:  pack.thumbnail,
          total:      pack.total,
          owner_type: pack.owner_type
        }
      ))
    }
  }


  function treatError(error) {
    console.log("Error in getOwnedPacks():", error);
    status = 500
    message.fail = `Internal error when getting packs`
  }


  function proceed() {
    if (status) {
      res.status(status)
    }

    res.json(message)
  }
}


module.exports = {
  getOwnedPacks
}