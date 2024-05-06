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


// Reduce the 13-digit number value of Date.now(), such as
// 3333333333333 (18 August 2075) to a 7-character string
const chars = /* a string of 64 unique characters */
"0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ&$"
function getMSHash(number) {
  let hash = ""
  let ms = Date.now()

  while (ms) {
    const index = ms % 64
    hash += chars[index] // little endian
    ms = (ms - index) / 64
  }

  return hash
}


function filename(req, file, callback) {
  let name = file.originalname

  // <<< HACK: Convert the originalname to UTF-8
  // Tested with Cyrillic filenames on:
  // * Chrome, Firefox, Safari on MacOS Sonoma
  // * Firefox on Ubuntu 2022.04 LTS
  // * Edge on Windows 11
  name = Buffer.from(name, 'latin1').toString('utf-8')
  file.originalname = name
  // https://github.com/expressjs/multer/issues/962#issuecomment-1283500468
  // HACK >>>

  // Generate an almost-unique string based on the precise
  // number of milliseconds since the Epoch when this function
  // was called. This could fail if two files with identical names
  // are treated within less than a millisecond of each other.
  const hash = getMSHash()
  const fileName = `${hash}-${name}`
  callback( null, fileName )
}


function destination (req, file, cb) {
  // Define where a given file is to be saved
  const { body } = req
  const { room: directoryName } = body
  if (directoryName) {
    // Save file immediately in its final resting place
    const path = absolutePath(directoryName)
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
// 'user' and 'room' fields will be added to req.body.
const fields = [
  { name: 'user', maxCount: 1 },
  { name: 'room', maxCount: 1 },
  { name: 'images' }
]
const readFields = upload.fields(fields)


module.exports = {
  readFields
}