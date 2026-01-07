var express = require("express");
var router = express.Router();
const path = require("path");
const { logger } = require("../modules/logger");

/* GET home page. */
router.get("/", function (req, res, next) {
  logger.info("[console] Home page accessed");
  logger.info("[logger] Home page accessed");
  res.sendFile(path.join(__dirname, "../templates/index.html"));
});

module.exports = router;
