/**
 * server/controllers/getPacks.js
 */

const { Pack } = require("../database")


function getPacks(req, res) {
  let status = 0
  let message = {}

  const query = req.body?.query || {}

  // const { query } = body
  // if (typeof query !== "object") {
  //   status = 400 // Bad Request
  //   const stringQuery = JSON.stringify(query)
  //   message.fail = `Unable to treat query ${stringQuery}`

  //   return proceed()
  // }

  Pack
    .find(query)
    .then(treatResult)
    .catch(treatError)
    .finally(proceed)


  function treatResult(packs) {
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
          count: pack.count,
        }
      ))
    }
  }


  function treatError(error) {
    console.log("Error in treatQuery():", error);
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
  getPacks
}