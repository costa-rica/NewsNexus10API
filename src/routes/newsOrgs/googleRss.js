const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../modules/userAuthentication");
const {
  buildQuery,
  buildRssUrl,
} = require("../../modules/newsOrgs/queryBuilder");
const { fetchRssItems } = require("../../modules/newsOrgs/rssFetcher");
const {
  ensureAggregatorSourceAndEntity,
  storeRequestAndArticles,
} = require("../../modules/newsOrgs/storageGoogleRss");
const logger = require("../../modules/logger");

/**
 * POST /google-rss/make-request
 * Fetches articles from Google News RSS and returns parsed data without saving to database
 */
router.post("/make-request", authenticateToken, async (req, res) => {
  try {
    const {
      and_keywords,
      and_exact_phrases,
      or_keywords,
      or_exact_phrases,
      time_range,
    } = req.body;

    // Validate: at least one query parameter is required
    if (
      !and_keywords &&
      !and_exact_phrases &&
      !or_keywords &&
      !or_exact_phrases
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid parameters",
        message:
          "At least one of and_keywords, and_exact_phrases, or_keywords, or_exact_phrases must be provided",
      });
    }

    // Build query and URL
    const queryResult = buildQuery({
      and_keywords: and_keywords || "",
      and_exact_phrases: and_exact_phrases || "",
      or_keywords: or_keywords || "",
      or_exact_phrases: or_exact_phrases || "",
      time_range: time_range || "",
    });

    const url = buildRssUrl(queryResult.query);
    logger.info(`Fetching Google RSS: ${url}`);

    // Fetch RSS feed
    const result = await fetchRssItems(url);

    // Handle errors
    if (result.status === "error") {
      // Special handling for HTTP 503 (rate limit)
      if (result.statusCode === 503) {
        return res.status(503).json({
          success: false,
          error: "Rate limit exceeded",
          message:
            "Google News returned HTTP 503. Please wait before retrying.",
          statusCode: 503,
        });
      }

      // General error
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: `Failed to fetch RSS feed: ${result.error}`,
      });
    }

    // Success response
    res.status(200).json({
      success: true,
      url: url,
      articlesArray: result.items,
      count: result.items.length,
    });
  } catch (error) {
    logger.error("Error in POST /google-rss/:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message || "An unexpected error occurred",
    });
  }
});

/**
 * POST /google-rss/add-to-database
 * Saves previously fetched articles to the NewsNexus database
 */
router.post("/add-to-database", authenticateToken, async (req, res) => {
  try {
    const {
      articlesArray,
      url,
      and_keywords,
      and_exact_phrases,
      or_keywords,
      or_exact_phrases,
      time_range,
    } = req.body;

    // Validate required fields
    if (
      !articlesArray ||
      !Array.isArray(articlesArray) ||
      articlesArray.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        message: "articlesArray must be a non-empty array",
      });
    }

    if (!url || typeof url !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        message: "url is required and must be a string",
      });
    }

    // Validate article structure
    for (const article of articlesArray) {
      if (!article.title || !article.link) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          message: "Each article must have at least title and link fields",
        });
      }
      if (!article.description && !article.content) {
        return res.status(400).json({
          success: false,
          error: "Invalid request",
          message:
            "Each article must have at least one of description or content",
        });
      }
    }

    // Basic URL validation - should be a Google News RSS URL
    if (!url.includes("news.google.com/rss")) {
      logger.warn(`Unusual URL format (not Google News RSS): ${url}`);
    }

    // Ensure database entities exist
    const { newsArticleAggregatorSourceId, entityWhoFoundArticleId } =
      await ensureAggregatorSourceAndEntity();

    // Build andString and orString for database
    const andStringParts = [and_keywords, and_exact_phrases].filter(Boolean);
    const orStringParts = [or_keywords, or_exact_phrases].filter(Boolean);

    const andString =
      andStringParts.length > 0 ? andStringParts.join(", ") : null;
    const orString = orStringParts.length > 0 ? orStringParts.join(", ") : null;

    // Store request and articles
    const storageResult = await storeRequestAndArticles({
      requestUrl: url,
      andString,
      orString,
      items: articlesArray,
      newsArticleAggregatorSourceId,
      entityWhoFoundArticleId,
    });

    // Build success message
    const duplicateCount =
      storageResult.articlesReceived - storageResult.articlesSaved;
    let message = `Successfully saved ${storageResult.articlesSaved} of ${storageResult.articlesReceived} articles to database`;
    if (duplicateCount > 0) {
      message += ` (${duplicateCount} duplicate${duplicateCount > 1 ? "s" : ""} skipped)`;
    }

    res.status(200).json({
      success: true,
      newsApiRequestId: storageResult.newsApiRequestId,
      articlesReceived: storageResult.articlesReceived,
      articlesSaved: storageResult.articlesSaved,
      articleIds: storageResult.articleIds,
      message,
    });
  } catch (error) {
    logger.error("Error in POST /google-rss/add-to-database:", error);
    res.status(500).json({
      success: false,
      error: "Database error",
      message: `Failed to save articles: ${error.message}`,
    });
  }
});

module.exports = router;
