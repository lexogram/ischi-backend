/**
 * server/controllers/getPacks.js
 */

const { Organization, Pack } = require("../database")


function getEventPacks(req, res) {
  let status = 0
  let message = {}

  // const query = req.body?.query || { a: "b" }
  const query = { munge_name : null }

  console.log("query:", query);
  

  Organization
    .findOne(query)
    .then(getPacksFor)
    .catch(treatError)
    .finally(proceed)

  async function getPacksFor(organization) {
    console.log("organization:", organization);
    
    if (!organization) {
      return treatError(
        `Organization ${query.organization} not found`
      )
    }

    const { _id: owner_id } = organization
    const packQuery = { owner_id }
    console.log("packQuery:", packQuery);
    

    await Pack
      .find(packQuery)
      .then(treatResult)
      .catch(treatError)
  }


  function treatResult(packs) {
    console.log("packs:", packs);
    
    const length = packs.length
    if (!length) {
      status = 404 // Not Found
      const stringQuery = JSON.stringify(query)
      message.fail = `Query ${stringQuery} matches no images`

    } else {
      const plural = length !== 1
      message.success = `Found ${length} pack${plural ? "s" : ""}`
      message.packs = packs.map( pack => (
        {
          name: pack.name,
          folder: pack.folder,
          thumbnail: pack.thumbnail,
          total: pack.total,
        }
      ))
    }
  }


  function treatError(error) {
    console.log("Error in getEventPacks():", error);
    status = 500
    const stringQuery = JSON.stringify(query)
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
  getEventPacks
}