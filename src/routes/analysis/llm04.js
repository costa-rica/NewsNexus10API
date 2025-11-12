var express = require("express");
var router = express.Router();
const { authenticateToken } = require("../../modules/userAuthentication");
const {
  sqlQueryArticlesApprovedChatGptWithStatesApprovedReportContract,
} = require("../../modules/analysis/llm04");
const { ArticlesApproved02, ArticleApproved } = require("newsnexus10db");

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
    article.ArticlesApproved02?.some(
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

// 🔹 GET /analysis/llm04/human-approved/:articleId
router.get(
  "/human-approved/:articleId",
  authenticateToken,
  async (req, res) => {
    console.log("- GET /analysis/llm04/human-approved/:articleId");
    const { articleId } = req.params;
    const userId = req.user.id;

    try {
      // 1. Look up ArticlesApproved02 records for this articleId
      const aiApprovedRecords = await ArticlesApproved02.findAll({
        where: { articleId },
      });

      // 2. Validate: No records found
      if (aiApprovedRecords.length === 0) {
        return res.status(404).json({
          error: `No row for articleId ${articleId} in the ArticlesApproved02 table`,
        });
      }

      // 3. Validate: Multiple records found
      if (aiApprovedRecords.length > 1) {
        return res.status(400).json({
          error: `Multiple rows in the ArticlesApproved02 table for the same articleId ${articleId}`,
        });
      }

      const aiApproved = aiApprovedRecords[0];

      // 4. Check if ArticleApproveds record exists for this articleId
      const existingHumanApproval = await ArticleApproved.findOne({
        where: { articleId },
      });

      // 5. If exists with isApproved=true, return error
      if (existingHumanApproval && existingHumanApproval.isApproved === true) {
        return res.status(400).json({
          error: `This article has already been human approved`,
        });
      }

      // 6. Prepare data to copy from ArticlesApproved02
      const dataToSave = {
        articleId,
        userId,
        isApproved: aiApproved.isApproved,
        headlineForPdfReport: aiApproved.headlineForPdfReport,
        publicationNameForPdfReport: aiApproved.publicationNameForPdfReport,
        publicationDateForPdfReport: aiApproved.publicationDateForPdfReport,
        textForPdfReport: aiApproved.textForPdfReport,
        urlForPdfReport: aiApproved.urlForPdfReport,
      };

      // 7. Update or create record
      if (existingHumanApproval && existingHumanApproval.isApproved === false) {
        // Update existing record
        await existingHumanApproval.update(dataToSave);
      } else {
        // Create new record
        await ArticleApproved.create(dataToSave);
      }

      // 8. Return success message
      res.json({
        message: "Successfully human approved article",
      });
    } catch (error) {
      console.error("Error in /human-approved/:articleId:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }
);

module.exports = router;
