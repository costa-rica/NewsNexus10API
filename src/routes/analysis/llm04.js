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

  const approvedArticlesArray = articlesArray.filter((article) =>
    article.ArticleApproveds?.some(
      (entry) => entry.isApproved === true || entry.isApproved === 1
    )
  );

  const approvedArticlesArrayModified = approvedArticlesArray.map((article) => {
    let stateAbbreviation = "";
    if (article.States?.length === 1) {
      stateAbbreviation = article.States[0].abbreviation;
    } else if (article.States?.length > 1) {
      stateAbbreviation = article.States.map(
        (state) => state.abbreviation
      ).join(", ");
    }
    return {
      ...article,
      stateAbbreviation,
    };
  });

  console.log(
    `- approvedArticlesArrayModified.length (after filtering): ${approvedArticlesArrayModified.length}`
  );

  const timeToRenderResponseFromApiInSeconds = (Date.now() - startTime) / 1000;
  res.json({
    articlesArray: approvedArticlesArrayModified,
    timeToRenderResponseFromApiInSeconds,
  });
});

module.exports = router;
