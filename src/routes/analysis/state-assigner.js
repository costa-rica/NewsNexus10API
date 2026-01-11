var express = require("express");
var router = express.Router();
const { authenticateToken } = require("../../modules/userAuthentication");
const logger = require("../../modules/logger");
const {
  sqlQueryArticlesWithStateAssignments,
} = require("../../modules/analysis/state-assigner-sql");
const {
  formatArticlesWithStateAssignments,
  validateStateAssignerRequest,
} = require("../../modules/analysis/state-assigner");

/**
 * POST /analysis/state-assigner/
 * Returns articles with their AI-assigned state data from ArticleStateContracts02
 *
 * Request body:
 * {
 *   includeNullState: boolean (optional) - If true, return articles with null stateId
 * }
 *
 * Response:
 * {
 *   result: boolean,
 *   message: string,
 *   count: number,
 *   articles: [
 *     {
 *       id: number,
 *       title: string,
 *       description: string,
 *       url: string,
 *       createdAt: date,
 *       stateAssignment: {
 *         promptId: number,
 *         isHumanApproved: boolean,
 *         isDeterminedToBeError: boolean,
 *         occuredInTheUS: boolean,
 *         reasoning: string,
 *         stateId: number,
 *         stateName: string
 *       }
 *     }
 *   ]
 * }
 */
router.post("/", authenticateToken, async (req, res) => {
  logger.info("- in POST /analysis/state-assigner/");

  try {
    const { includeNullState } = req.body;

    // Validate request parameters
    const validation = validateStateAssignerRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        result: false,
        message: validation.error,
      });
    }

    logger.info(
      `Request parameters - includeNullState: ${includeNullState ?? false}`
    );

    // Query database for articles with state assignments
    const rawResults = await sqlQueryArticlesWithStateAssignments({
      includeNullState: includeNullState ?? false,
    });

    // Format results for frontend
    const formattedArticles = formatArticlesWithStateAssignments(rawResults);

    logger.info(
      `Successfully retrieved ${formattedArticles.length} articles with state assignments`
    );

    // Return successful response
    res.status(200).json({
      result: true,
      message: "Successfully retrieved articles with state assignments",
      count: formattedArticles.length,
      articles: formattedArticles,
    });
  } catch (error) {
    logger.error("Error in POST /analysis/state-assigner/:", error);
    res.status(500).json({
      result: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

module.exports = router;
