var express = require("express");
var router = express.Router();
const { authenticateToken } = require("../../modules/userAuthentication");
const {
  sqlQueryArticlesApprovedChatGptWithStatesApprovedReportContract,
} = require("../../modules/analysis/llm04");

// 🔹 GET /analysis/llm04/approved
router.get("/approved", authenticateToken, async (req, res) => {
  console.log("- GET /analysis/llm04/approved");
  const startTime = Date.now();
  const articlesArray =
    await sqlQueryArticlesApprovedChatGptWithStatesApprovedReportContract();

  console.log(
    `- articlesArray.length (before filtering): ${articlesArray.length}`
  );
});

module.exports = router;
