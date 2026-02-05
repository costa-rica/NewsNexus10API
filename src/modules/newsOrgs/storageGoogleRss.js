const {
  Article,
  ArticleContent,
  EntityWhoFoundArticle,
  NewsApiRequest,
  NewsArticleAggregatorSource,
} = require("newsnexus10db");
const logger = require("../logger");

const GOOGLE_NEWS_RSS_ORG_NAME = "Google News RSS";

/**
 * Ensure that the NewsArticleAggregatorSource and EntityWhoFoundArticle exist for Google News RSS
 * @returns {Promise<Object>} Object with newsArticleAggregatorSourceId and entityWhoFoundArticleId
 */
async function ensureAggregatorSourceAndEntity() {
  let source = await NewsArticleAggregatorSource.findOne({
    where: { nameOfOrg: GOOGLE_NEWS_RSS_ORG_NAME },
  });

  if (!source) {
    source = await NewsArticleAggregatorSource.create({
      nameOfOrg: GOOGLE_NEWS_RSS_ORG_NAME,
      isRss: true,
      isApi: false,
    });
    logger.info(`Created NewsArticleAggregatorSource: ${GOOGLE_NEWS_RSS_ORG_NAME}`);
  }

  let entity = await EntityWhoFoundArticle.findOne({
    where: { newsArticleAggregatorSourceId: source.id },
  });

  if (!entity) {
    entity = await EntityWhoFoundArticle.create({
      newsArticleAggregatorSourceId: source.id,
    });
    logger.info(`Created EntityWhoFoundArticle for: ${GOOGLE_NEWS_RSS_ORG_NAME}`);
  }

  return {
    newsArticleAggregatorSourceId: source.id,
    entityWhoFoundArticleId: entity.id,
  };
}

/**
 * Store the RSS request and articles to the database
 * @param {Object} params - Storage parameters
 * @param {string} params.requestUrl - The Google RSS URL that was requested
 * @param {string|null} params.andString - Combined AND keywords and phrases
 * @param {string|null} params.orString - Combined OR keywords and phrases
 * @param {Array} params.items - Array of RSS items to store
 * @param {number} params.newsArticleAggregatorSourceId - Source ID
 * @param {number} params.entityWhoFoundArticleId - Entity ID
 * @returns {Promise<Object>} Result with request ID and article counts
 */
async function storeRequestAndArticles(params) {
  const requestDate = new Date().toISOString().split("T")[0];

  // Create NewsApiRequest record
  const request = await NewsApiRequest.create({
    newsArticleAggregatorSourceId: params.newsArticleAggregatorSourceId,
    dateEndOfRequest: requestDate,
    countOfArticlesReceivedFromRequest: params.items.length,
    status: "success",
    url: params.requestUrl,
    andString: params.andString,
    orString: params.orString,
    notString: null,
    isFromAutomation: false, // User-initiated request via API
  });

  let savedCount = 0;
  const articleIds = [];

  // Store each article
  for (const item of params.items) {
    if (!item.link) {
      logger.warn("Skipping article without link");
      continue;
    }

    // Check for duplicate
    const existing = await Article.findOne({ where: { url: item.link } });
    if (existing) {
      logger.info(`Skipping duplicate article: ${item.link}`);
      continue;
    }

    // Parse publication date
    let publishedDate = null;
    if (item.pubDate) {
      try {
        publishedDate = new Date(item.pubDate);
      } catch (error) {
        logger.warn(`Failed to parse pubDate: ${item.pubDate}`);
      }
    }

    // Create Article record
    const article = await Article.create({
      publicationName: item.source || "Unknown",
      title: item.title || "",
      description: item.description || "",
      url: item.link,
      publishedDate: publishedDate,
      entityWhoFoundArticleId: params.entityWhoFoundArticleId,
      newsApiRequestId: request.id,
    });

    savedCount += 1;
    articleIds.push(article.id);

    // Create ArticleContent record if content exists
    if (item.content || item.description) {
      await ArticleContent.create({
        articleId: article.id,
        content: item.content || item.description,
      });
    }
  }

  // Update the request with saved count
  await request.update({
    countOfArticlesSavedToDbFromRequest: savedCount,
  });

  logger.info(
    `Stored ${savedCount} new articles for request ${request.id} (${params.items.length} received).`
  );

  return {
    newsApiRequestId: request.id,
    articlesReceived: params.items.length,
    articlesSaved: savedCount,
    articleIds,
  };
}

module.exports = {
  ensureAggregatorSourceAndEntity,
  storeRequestAndArticles,
  GOOGLE_NEWS_RSS_ORG_NAME,
};
