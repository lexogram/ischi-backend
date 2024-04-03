/**
 * controllers/treatQuery.js
 */

const { Image } = require('../database')


const treatQuery = (req, res) => {
  let status = 0
  let message = {}

  const { query } = req.body

  if (typeof query !== "object") {
    status = 400 // Bad Request
    const stringQuery = JSON.stringify(query)
    const fail = `Unable to treat query ${stringQuery}`
    message = { fail }
    return proceed()
  }

  Image
    .find(query)
    .then(treatResult)
    .catch(treatError)
    .finally(proceed)


  function treatResult(images) {
    if (!images.length) {
      status = 404 // Not Found
      const stringQuery = JSON.stringify(query)
      const fail = `Query ${stringQuery} matches no images`
      message = { fail }

    } else {
      message = images.map( image => image.src )
    }
  }


  function treatError(error) {
    console.log("Error in treatQuery():", error);
    status = 500
    const stringQuery = JSON.stringify(query)
    const fail = `Internal error treating query ${stringQuery}`
    message = { fail }
  }


  function proceed() {
    if (status) {
      res.status(status)
    }

    res.send(message)
  }

}


module.exports = {
  treatQuery
}