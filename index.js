const express = require("express");
const { Octokit } = require("@octokit/rest");
const axios = require("axios");
require("dotenv").config();
const bodyParser = require("body-parser");
const scanner = require("./src/scanner.js");
const cors = require("cors");
const routes = require("./src/routes/routes.js");

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


// ROUTING
app.get("/api/login", routes.login);

if (process.env.NODE_ENV === "production") {
  app.post("/api/callback", routes.productionCallback);
} else if (process.env.NODE_ENV === "development") {
  app.get("/api/callback",routes.developmentCallback);
}

app.post("/api/repos-to-badge", routes.reposToBadge);

// SERVER
app.listen(process.env.PORT, () => {
  console.log(`server listening on port ${process.env.PORT}`);
});
