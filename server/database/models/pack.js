/**
 * server/database/models/pack.js
 * 
 * A Pack may have:
 *   - no owner (available to all users)
 *   - a user owner (available only to that user and guests)
 *   - an organization owner (available to any user in the
 *     organization)
 * However, it must have an owner_type, which will be used
 * to determine in which collection to find the owner_id if there
 * is one.
 */

const { Schema, model } = require('mongoose')
const ownerTypes = [ "User", "Organization", "None", "Sampler" ]

const schema = new Schema({
  owner_id:   { type: Schema.Types.ObjectId },
  owner_type: { type: String, required: true, enum: ownerTypes },
  name:       { type: String, required: true },
  count:      { type: Number, required: true },
  thumbnail:  { type: String, required: true },
  folder:     { type: String, required: true },
 });

const Pack = model("Pack", schema);

module.exports = {
  Pack
}