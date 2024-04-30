/**
 * server/database/models/organization.js
 */

const { Schema, model } = require('mongoose')

const schema = new Schema({
  name: { type: String, required: true },
  munged_name: { type: String, required: true }
});

const Organization = model("Organization", schema);

module.exports = {
  Organization
}