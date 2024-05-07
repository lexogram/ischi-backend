/**
 * middleware/directory.js
 *
 * Helps ensure that uploaded files can be saved at a location
 * like:
 *
 *   __cwd/PUBLIC/UPLOAD/subfolder/filename.ext
 *
 * Uploaded files may be stored temporarily at...
 *
 *   __cwd/TEMP
 *
 * ... before being "renamed" to their final destination.
 *
 * Defines the folders where image files will be uploaded, and
 * ensures that they exist.
 * __cwd  = parent directory for the file launched by Node
 * TEMP   = relative path from __cwd to the directory where images
 *          will be stored if no subfolder name is available yet
 * PUBLIC = relative path from __cwd to directory used by Express
 *          for static files
 * UPLOAD = relative path from PUBLIC to directory where uploaded
 *          files will be permanently stored (when subfolder name
 *          is available)
 */

const fs = require('fs')
const path = require('path')
const __cwd = process.cwd()

const TEMP = path.join(__cwd, "temp")
const PUBLIC = "public"
const UPLOAD = "images"


const createIfNecessary = directory => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true })
  }
}


[ TEMP, path.join(__cwd, PUBLIC ) ].forEach( directory => (
  createIfNecessary(directory)
))


const absolutePath = (...folder) => {
  const directory = path.join(__cwd, PUBLIC, ...folder, UPLOAD)
  createIfNecessary(directory)

  return directory
}


const moveFile = (source, destination, callback) => {
  fs.rename( source, destination, callback )
}


module.exports = {
  TEMP,
  PUBLIC,
  UPLOAD,
  absolutePath,
  moveFile
}