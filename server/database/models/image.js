/**
 * server/database/models/image.js
 */

const { Schema, model } = require('mongoose')

const schema = new Schema({
  user: String,
  set: String,
  name: String,
  src: String,
  mimetype: String
});

const Image = model("Image", schema);

module.exports = {
  Image
}