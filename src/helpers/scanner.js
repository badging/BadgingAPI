const { bronzeBadge } = require("../badges");

const scanner = (email, DEI) => {
  // this will scan whether a badge has ever been assigned and what kind of badge then call the badges function later
  console.log("scanned");
  bronzeBadge(email, DEI);
};

module.exports = scanner;
