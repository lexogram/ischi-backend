/**
 * server/controllers/organization.js
 */



const { Organization } = require('../database')
const regEx = /[^a-zß-ÿЀ-ӿ]/ig
// Not standard letters in English, French and Cyrillic languages


const getOrg = (name, callback) => {
  const munged_name = munge(name)

  Organization
    .findOne({ munged_name })
    .then(treatEntry)
    .catch(treatError)

  function treatEntry(record) {
    if (record) {
      // Keep only the unnecessary fields
      const { name, _id } = record
      record = { name, _id }
      return callback(null, record)

    } else {
      createRecord() // and then call treatEntry with the result
    }
  }

  function createRecord() {
    new Organization({ name, munged_name })
      .save()
      .then(treatEntry)
      .catch(treatError)
  }

  function treatError(error) {
    console.log(`Error getting organization "${name}"`, error);
    callback(error)
  }
}


function munge(string) {
  return string.replace(regEx, "").toLowerCase()
}


module.exports = {
  getOrg
}