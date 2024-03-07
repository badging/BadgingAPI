const express = require("express");
const session = require("express-session");
const logger = require("./logger");
const router = express.Router();

router.use(express.urlencoded({ extended: true }));
router.use(
  session({
    secret: "my-secret",
    resave: false,
    saveUninitialized: true,
  })
);

router.get("/logs", (req, res) => {
  logger.info("Admin user accessed login page");
  res.send(`
      <form action="/login" method="post">
        <label for="username">Username:</label>
        <input type="text" id="username" name="username"><br><br>
        <label for="password">Password:</label>
        input type="password" id="password" name="password"><br><br>
        <button type="submit">Login</button>
      </form>
    `);
});

//Authentication
router.post("/logs/login", (req, res) => {
  const { username, password } = req.body;
  const validUsername = process.env.ELASTICSEARCH_USERNAME; // Replace with your environment variable for username
  const validPassword = process.env.ELASTICSEARCH_PASSWORD; // Replace with your environment variable for password

  if (username === validUsername && password === validPassword) {
    req.session.user = { username: validUsername };
    logger.info("User logged in successfully");
    res.redirect("dashboard");
  } else {
    logger.error("Invalid username or password");
    res.send("Invalid username or password");
  }
});

router.get("/logs/dashboard", (req, res) => {
  if (req.session && req.session.user) {
    logger.info("User accessed dashboard");
    res.redirect("/kibana-dashboard");
  } else {
    logger.warn("Unauthorized access to dashboard");
    res.redirect("/logs");
  }
});

// Route to redirect to Kibana dashboard
router.get("/kibana-dashboard", (req, res) => {
  // Redirect to Kibana dashboard URL
  res.redirect("http://localhost:5601");
});

module.exports = router;
