const winston = require("winston");

// Create a Winston logger
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(), // Add timestamp to log messages
    winston.format.json() // Use JSON format for log messages
  ),
  transports: [
    new winston.transports.Http({
      host: "localhost",
      port: 24224, // Fluentd port
      path: "/debug.fluentd", // Fluentd input path
      ssl: false, // Use SSL if required
    }),
  ],
});

module.exports = logger;