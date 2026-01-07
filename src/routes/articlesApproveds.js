var express = require("express");
var router = express.Router();
const { authenticateToken } = require("../modules/userAuthentication");
const {
  sqlQueryArticlesApprovedForComponent,
} = require("../modules/queriesSql");
const logger = require("../modules/logger");

// 🔹 GET /articles-approveds/for-component
router.get("/for-component", authenticateToken, async (req, res) => {
  logger.info("- GET /articles-approveds/for-component");
  const user = req.user;

  try {
    const articlesArray = await sqlQueryArticlesApprovedForComponent(user.id);

    logger.info(`- articlesArray.length: ${articlesArray.length}`);

    res.json({
      articlesArray,
      count: articlesArray.length,
    });
  } catch (error) {
    logger.error("❌ Error in /articles-approveds/for-component:", error);
    res.status(500).json({
      error: "Failed to fetch approved articles for component.",
      message: error.message,
    });
  }
});

module.exports = router;
