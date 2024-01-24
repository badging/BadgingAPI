const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dbconnect = require("./database/helpers/dbconnect");
const routes = require("./routes/index.js");
require("dotenv").config();
const proxy = require("express-http-proxy");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    optionsSuccessStatus: 200,
  })
);

// Add a proxy middleware for Event Badging Bot
app.use("/api/event_badging", proxy("http://localhost:4040"));

routes.setupRoutes(app);

(async () => {
  try {
    await dbconnect().then(() => {
      app.listen(process.env.PORT, () => {
        console.log(`server listening on port ${process.env.PORT}`);
      });
    });
  } catch (error) {
    console.log(error);
  }
})();
