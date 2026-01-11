var express = require("express");
var router = express.Router();
const { authenticateToken } = require("../../modules/userAuthentication");
const logger = require("../../modules/logger");
const {
  ArticleStateContract,
  ArticleStateContracts02,
} = require("newsnexus10db");
const {
  sqlQueryArticlesWithStateAssignments,
} = require("../../modules/analysis/state-assigner-sql");
const {
  formatArticlesWithStateAssignments,
  validateStateAssignerRequest,
  validateHumanVerifyRequest,
} = require("../../modules/analysis/state-assigner");
const { sqlQueryArticleDetails } = require("../../modules/queriesSql");
const { formatArticleDetails } = require("../../modules/articles");

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
    const { includeNullState } = req.body || {};

    // Validate request parameters
    const validation = validateStateAssignerRequest(req.body || {});
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

/**
 * POST /analysis/state-assigner/human-verify/:articleId
 * Approve or reject an AI-assigned state for an article
 *
 * Request body:
 * {
 *   action: "approve" | "reject",
 *   stateId: number
 * }
 *
 * Response:
 * {
 *   status: string,
 *   stateHumanApprovedArray: [...],
 *   stateAiApproved: {...}
 * }
 */
router.post(
  "/human-verify/:articleId",
  authenticateToken,
  async (req, res) => {
    logger.info("- in POST /analysis/state-assigner/human-verify/:articleId");

    try {
      const { articleId } = req.params;
      const { action, stateId } = req.body || {};

      logger.info(
        `articleId: ${articleId}, action: ${action}, stateId: ${stateId}`
      );

      // Validate articleId
      if (!articleId || isNaN(parseInt(articleId))) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid article ID provided",
            details: "Article ID must be a valid number",
            status: 400,
          },
        });
      }

      // Validate request body
      const validation = validateHumanVerifyRequest(req.body || {});
      if (!validation.isValid) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error,
            status: 400,
          },
        });
      }

      const parsedArticleId = parseInt(articleId);

      // Check if ArticleStateContracts02 row exists for this articleId and stateId
      const aiStateRow = await ArticleStateContracts02.findOne({
        where: {
          articleId: parsedArticleId,
          stateId: stateId,
        },
      });

      if (!aiStateRow) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "AI state assignment not found",
            details: `No AI state assignment exists for article ${parsedArticleId} with state ${stateId}`,
            status: 404,
          },
        });
      }

      if (action === "approve") {
        // Update ArticleStateContracts02 to set isHumanApproved = true
        await ArticleStateContracts02.update(
          { isHumanApproved: true },
          {
            where: {
              articleId: parsedArticleId,
              stateId: stateId,
            },
          }
        );

        // Check if row already exists in ArticleStateContracts
        const existingHumanState = await ArticleStateContract.findOne({
          where: {
            articleId: parsedArticleId,
            stateId: stateId,
          },
        });

        if (existingHumanState) {
          return res.status(409).json({
            error: {
              code: "CONFLICT",
              message: "State already approved",
              details: `Article ${parsedArticleId} already has human-approved state ${stateId}`,
              status: 409,
            },
          });
        }

        // Create new row in ArticleStateContracts
        await ArticleStateContract.create({
          articleId: parsedArticleId,
          stateId: stateId,
        });

        logger.info(
          `Article ${parsedArticleId} state ${stateId} approved by human`
        );
      } else if (action === "reject") {
        // Update ArticleStateContracts02 to set isHumanApproved = false
        await ArticleStateContracts02.update(
          { isHumanApproved: false },
          {
            where: {
              articleId: parsedArticleId,
              stateId: stateId,
            },
          }
        );

        // Delete row in ArticleStateContracts if it exists
        await ArticleStateContract.destroy({
          where: {
            articleId: parsedArticleId,
            stateId: stateId,
          },
        });

        logger.info(
          `Article ${parsedArticleId} state ${stateId} rejected by human`
        );
      }

      // Re-query to get updated data
      const rawResults = await sqlQueryArticleDetails(parsedArticleId);
      const articleDetails = formatArticleDetails(rawResults);

      if (!articleDetails) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Article not found",
            details: `No article exists with ID ${parsedArticleId}`,
            status: 404,
          },
        });
      }

      // Return successful response
      res.status(200).json({
        status:
          action === "approve"
            ? "Article state approved successfully"
            : "Article state rejected successfully",
        stateHumanApprovedArray: articleDetails.stateHumanApprovedArray || [],
        stateAiApproved: articleDetails.stateAiApproved || null,
      });
    } catch (error) {
      logger.error(
        "Error in POST /analysis/state-assigner/human-verify/:articleId:",
        error
      );
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to process human verification",
          details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
          status: 500,
        },
      });
    }
  }
);

module.exports = router;
