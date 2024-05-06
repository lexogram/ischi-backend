/**
 * middleware/multer.js
 *
 * Defines filename() and destination() functions which will
 * rename uploaded files and determine the destination directory
 * where Multer should save them.
 *
 * Tells Multer to create an upload object whose fields() method
 * will be used to:
 * - Add data about uploaded files to an array at req.files
 * - Add key-value pairs to req.body for all fields with text
 *   values
 *
 * Files are renamed according to the millisecond at which they
 * are treated. Files are saved either in a TEMP directory, if
 * no specific directoryName is provided by req.body, or in that
 * specific directory.
 */

const multer = require('multer')
const { absolutePath, TEMP } = require('./directory')



function filename(req, file, callback) {
  let name = file.originalname
  const { body } = req
  let nameMap
  try {
    nameMap = JSON.parse(body?.nameMap)
  } catch {
    nameMap = {}
  }

  // <<< HACK: Convert the originalname to UTF-8
  // Tested with Cyrillic filenames on:
  // * Chrome, Firefox, Safari on MacOS Sonoma
  // * Firefox on Ubuntu 2022.04 LTS
  // * Edge on Windows 11
  name = Buffer.from(name, 'latin1').toString('utf-8')
  file.originalname = name
  // https://github.com/expressjs/multer/issues/962#issuecomment-1283500468
  // HACK >>>

  const fileName = nameMap[name] || name
  callback( null, fileName )
}


function getBreadcrumbs(req) {
  const { body, user_id, organization_id } = req
  const { app, packName } = (body || {})
  const owner_id = organization_id || user_id || ""

  return [ app, owner_id, packName ].filter( crumb => !!crumb )
}


function destination(req, file, cb) {
  // Define where a given file is to be saved
  const breadcrumbs = getBreadcrumbs(req)

  if (breadcrumbs.length ) {
    // Save file immediately in its final resting place
    const path = absolutePath(...breadcrumbs)
    cb(null, path)

  } else {
    // Save it to a temporary location, until "room" is available
    cb(null, TEMP );
  }
}


const storage = multer.diskStorage({
  filename,
  destination
});


const upload = multer({ storage });


// The HTML form sends the following fields. The `images` field
// will contain file data that will be saved to req.files. The
// 'owner_id' and 'packName' fields will be added to req.body.
const fields = [
  { name: 'app',       maxCount: 1 },
  { name: 'name',      maxCount: 1 },
  { name: 'packName',  maxCount: 1 },
  { name: 'nameMap',   maxCount: 1 },
  { name: 'total',     maxCount: 1 },
  { name: 'packData',  maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
  { name: 'images' }
]
const readFields = upload.fields(fields)


module.exports = {
  readFields,
  getBreadcrumbs
}