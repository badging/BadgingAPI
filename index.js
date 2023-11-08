require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });

const cors = require("cors");
const dbconnect = require("./database/helpers/dbconnect");
const express = require("express");
const bodyParser = require("body-parser");
const routes = require("./src/routes/index.js");

const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    optionsSuccessStatus: 200,
  })
);

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
