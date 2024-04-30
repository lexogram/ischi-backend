/**
 * server/database/models/user.js
 */

const { Schema, model } = require('mongoose')

const schema = new Schema({
  username: { type: String, required: true },
  organization: String,
  organization_id: {
    type: Schema.Types.ObjectId,
    ref: "Organization"
  },
  email: { type: String, required: true },
  hash: { type: String, required: true },
  icon: String
});

const User = model("User", schema);

module.exports = {
  User
}