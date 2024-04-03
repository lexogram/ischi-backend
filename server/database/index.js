
const MONGO_DB = process.env.MONGO_DB

const mongoose = require("mongoose");
const { Image } = require("./models/image")

mongoose.set("strictQuery", true); // false by default > v6


mongoose
  .connect(DB)
  .then(() => {
    console.log(`Connected to ${MONGO_DB}`)
  })

  .catch( error => {
    console.log("DB connection ERROR:\n", error);
    process.exit()
  })


const db = {
  mongoose,
  Image
}


module.exports = db