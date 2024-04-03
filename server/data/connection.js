const mongoose = require("mongoose");
mongoose.set("strictQuery", false);

// const { MongoClient } = require('mongodb')
const MONGO_DB = process.env.MONGO_DB
// const client = new MongoClient(MONGO_DB)


// const openDB = async () => {
//   try {
//     const connection = await client.connect()
//     const db = connection.db("museum")

//     return db

//   } catch(error) {
//     console.log("Error:", error);
//   }
// }

// module.exports = openDB


async function main() {
  const instance = await mongoose.connect(MONGO_DB)  
  console.log(`Connected to database at ${MONGO_DB}`)
}

console.log("About to run main()")
main()
  .catch(error => console.log("DB Error:", error));
