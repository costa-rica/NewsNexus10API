var express = require("express");
var router = express.Router();
const { authenticateToken } = require("../modules/userAuthentication");
const { sqlQueryArticlesApprovedForComponent } = require("../modules/queriesSql");

// 🔹 GET /articles-approveds/for-component
router.get("/for-component", authenticateToken, async (req, res) => {
  console.log("- GET /articles-approveds/for-component");
  const user = req.user;

  try {
    const articlesArray = await sqlQueryArticlesApprovedForComponent(user.id);

    console.log(`- articlesArray.length: ${articlesArray.length}`);

    res.json({
      articlesArray,
      count: articlesArray.length
    });
  } catch (error) {
    console.error("❌ Error in /articles-approveds/for-component:", error);
    res.status(500).json({
      error: "Failed to fetch approved articles for component.",
      message: error.message
    });
  }
});

module.exports = router;
