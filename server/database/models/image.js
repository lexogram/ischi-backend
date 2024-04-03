/**
 * server/database/models/image.js
 */

const { Schema, model } = require('mongoose')

const schema = new Schema({
  user: { type: String, required: true },
  set: { type: String, required: true },
  name: { type: String, required: true },
  src: { type: String, required: true },
  mimetype: { type: String, required: true }
 });

const Image = model("Image", schema);

module.exports = {
  Image
}