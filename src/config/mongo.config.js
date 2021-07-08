const mongoose = require("mongoose");
const { mongo_uri } = require("./config");

const {
  MONGO_USERNAME,
  MONGO_PASSWORD,
  MONGO_HOSTNAME,
  MONGO_PORT,
  MONGO_DB,
  ATLAS_URI,
} = process.env;

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
};

// const mongo_uri = `mongodb://${MONGO_HOSTNAME}:${MONGO_PORT}/${MONGO_DB}`;

// events handling
// connection.on("error", console.error.bind(console, "connection error:"));
// connection.once("open", () => {
//   // we're connected!
//   console.log("MongoDB Server Connected!");
// });

module.exports = async () => {
  await mongoose
    .connect(mongo_uri, options)
    .then(
      (resolve) => {
        console.log(`Mongoose Connection Established`);
        return resolve;
      },
      (reject) => {
        console.log(`Mongoose Connection Rejected: ${reject}`);
        return null;
      }
    )
    .catch((err) => {
      console.log(`Mongoose Connection Error: ${err}`);
      return null;
    });
};
