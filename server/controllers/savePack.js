/**
 * server/controllers/savePack.js
 */


// require specific methods of 'path', so that we can use the
// variable 'path' elsewhere, with no conflicts.
const { basename, join } = require('path')
const fs = require('fs')
const { recordPack } = require('../controllers/recordPack')


const {
  UPLOAD,
  absolutePath,
  moveFile,
  getBreadcrumbs
} = require('../middleware')

const JSON_FILE = "index.json"


const savePack = (req, res) => {
  const { files, body } = req
  // By the time uploader is called, body will have been created
  const { nameMap, packData } = body
  const images = files?.images || [] // there may be no images


  // Get destination directory relative to PUBLIC dir. Include
  // UPLOAD manually in the relative path, but absolutePath()
  // will add it automatically
  const breadcrumbs = getBreadcrumbs(req)
  const folder = join(...breadcrumbs, UPLOAD)
  // Ensure that the destination directory exists
  const fullPath = absolutePath(...breadcrumbs)


  // Ensure that each image has been uploaded to the correct place
  const promises = images.map( file => {
    return new Promise(treatFile)

    function treatFile(resolve) {
      const {
        path,        // "public/temp/hAs4$&-originalname.ext"
        originalname // name of file on end-user's device
      } = file
      // Get name of image file with its extension but no path
      const shortName = basename(path)
      const fileName = nameMap[shortName] || shortName
      // Get image URL that a browser can use
      const src = join("/", folder, fileName)

      const to = `${fullPath}/${fileName}`

      if (path === to) {
        // The file is already at its final resting place
        resolve(src)

      } else {
        // Asynchronously move the file then call completeMove
        moveFile( path, to, completeMove )
      }

      function completeMove(error) {
        if (error) { // moveFile() was called, and failed
          console.log(`mv failed for image ${originalname}:\n${error}`);
          resolve({
            status: 500,
            error: `${originalname} not saved`
          })

        } else {
          resolve(src)
        }
      }
    }
  })

  // Save the index.json file
  promises.push((() => {
    return new Promise(savePackData)

    function savePackData(resolve) {
      const jsonFile = join(fullPath, "..", JSON_FILE)
      fs.writeFile(jsonFile, packData, completeWrite)

      function completeWrite(error) {
        if (error) { // moveFile() was called, and failed
          console.log(`write failed for ${jsonFile}:\n${error}`);
          resolve({
            status: 500,
            error: `index.json file not saved`
          })

        } else {
          // Success
          const url = join("/", folder, JSON_FILE)
          resolve(url)
        }
      }
    }
  })())


  if (true) { // <<< TODO // TODO // TODO // TODO // TODO //
    // owner_id:   { type: Schema.Types.ObjectId },
    // owner_type: { type: String, required: true, enum: ownerTypes },
    // name:       { type: String, required: true },
    // total:      { type: Number, required: true },
    // thumbnail:  { type: String, required: true },
    // folder:     { type: String, required: true },

    // This pack has not been saved yet: create a new Pack record
    promises.push((() => {
      return new Promise(createPackRecord)

      function createPackRecord(resolve) {
        // Assemble the record data
        const { user_id, organization_id } = req
        const [ owner_id, owner_type ] = organization_id
        ? [ organization_id, "Organization" ]
        : [ user_id, "User" ]

        const { packName, name, total, thumbnail } = body
        const folder = join(owner_id, packName)

        const record = {
          owner_id,
          owner_type,
          name,
          folder,
          total,
          thumbnail
        }

        const callback = (error, result) => {
          if (error) {
            console.log("RecordPack error:\n", error);

            return resolve({
              status: 500,
              error: `Pack record not created`
            })
          }

          resolve(result)
        }

        recordPack(record, callback)
      }
    })()) // TODO // TODO // TODO // TODO // TODO >>>
  }


  Promise
   .all(promises)
   .then(result => res.send(result))
}


module.exports = {
  savePack
}