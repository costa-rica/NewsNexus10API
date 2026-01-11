const {
  sequelize,
  NewsApiRequest,
  NewsArticleAggregatorSource,
  NewsApiRequestWebsiteDomainContract,
  WebsiteDomain,
  Article,
  ArticleApproved,
} = require("newsnexus10db");
const { Op } = require("sequelize");
const logger = require("./logger");
/**
 * Returns article metadata with the max keywordRating and its keyword,
 * filtered by a specific entityWhoCategorizesId.
 *
 * @param {number} entityWhoCategorizesId
 * @param {string|null} publishedDateAfter - Optional publishedDate filter
 * @returns {Promise<Array>} rawArticles
 */
async function createArticlesArrayWithSqlForSemanticKeywordsRating(
  entityWhoCategorizesId,
  publishedDateAfter = null
) {
  let dateCondition = "";
  if (publishedDateAfter) {
    dateCondition = `AND a.publishedDate >= '${publishedDateAfter}'`;
  }

  const sql = `
    SELECT
      a.id,
      a.title,
      a.description,
      a.url,
      a.publishedDate,
      arc.keyword AS keywordOfRating,
      arc.keywordRating
    FROM Articles a
    LEFT JOIN (
      SELECT arc1.*
      FROM ArticleEntityWhoCategorizedArticleContracts arc1
      JOIN (
        SELECT articleId, MAX(keywordRating) AS maxRating
        FROM ArticleEntityWhoCategorizedArticleContracts
        WHERE entityWhoCategorizesId = ${entityWhoCategorizesId}
        GROUP BY articleId
      ) arc2
      ON arc1.articleId = arc2.articleId AND arc1.keywordRating = arc2.maxRating
      WHERE arc1.entityWhoCategorizesId = ${entityWhoCategorizesId}
    ) arc
    ON a.id = arc.articleId
    WHERE 1=1 ${dateCondition}
  `;

  const [rawArticles, metadata] = await sequelize.query(sql);
  return rawArticles;
}

// --------------------------------
// Queries
// --------------------------------
async function createNewsApiRequestsArray() {
  const requestsArray = await NewsApiRequest.findAll({
    include: [
      {
        model: NewsArticleAggregatorSource,
        attributes: ["nameOfOrg"],
      },
      {
        model: NewsApiRequestWebsiteDomainContract,
        include: [
          {
            model: WebsiteDomain,
            attributes: ["name"],
          },
        ],
      },
    ],
  });

  logger.info("requestsArray.length: ", requestsArray.length);

  const requestArrayFormatted = requestsArray.map((request) => {
    // Extract domain names from included contracts
    const domainNames = request.NewsApiRequestWebsiteDomainContracts.map(
      (contract) => contract.WebsiteDomain?.name
    ).filter(Boolean);

    return {
      id: request.id,
      andString: request.andString,
      orString: request.orString,
      notString: request.notString,
      nameOfOrg: request.NewsArticleAggregatorSource?.nameOfOrg || "N/A",
      includeOrExcludeDomainsString: domainNames.join(", "),
      createdAt: request.createdAt,
    };
  });

  return requestArrayFormatted;
}

async function createArticlesApprovedArray(dateRequestsLimit) {
  let articles;
  if (dateRequestsLimit) {
    dateRequestsLimit = new Date(dateRequestsLimit);
    articles = await Article.findAll({
      where: {
        createdAt: {
          [Op.gte]: dateRequestsLimit,
        },
      },
      include: [
        {
          model: ArticleApproved,
          required: true, // ensures only articles with approved entries are fetched
        },
      ],
    });
  } else {
    articles = await Article.findAll({
      include: [
        {
          model: ArticleApproved,
          required: true, // ensures only articles with approved entries are fetched
        },
      ],
    });
  }

  // const whereClause = dateRequestsLimit
  //   ? { createdAt: { [Op.gte]: dateRequestsLimit } }
  //   : {};

  // // Fetch Articles joined with any existing ArticleApproved rows
  // const articles = await Article.findAll({
  //   where: whereClause,
  //   include: [
  //     {
  //       model: ArticleApproved,
  //       required: true, // ensures only articles with approved entries are fetched
  //     },
  //   ],
  // });

  logger.info("✅ Approved articles count:", articles.length);

  const requestIdArray = [];
  let manualFoundCount = 0;

  for (const article of articles) {
    if (article.newsApiRequestId) {
      requestIdArray.push(article.newsApiRequestId);
    } else {
      manualFoundCount++;
    }
  }

  return { requestIdArray, manualFoundCount };
}

/**
 * Format article details from SQL query results
 * Handles multiple human-approved states and single AI-approved state
 * @param {Array} rawResults - Raw SQL query results from sqlQueryArticleDetails
 * @returns {Object|null} Formatted article object or null if no article found
 */
function formatArticleDetails(rawResults) {
  if (!rawResults || rawResults.length === 0) {
    return null;
  }

  const firstRow = rawResults[0];

  // Build base article data
  const articleData = {
    articleId: firstRow.articleId,
    title: firstRow.title,
    description: firstRow.description,
    url: firstRow.url,
  };

  // Add content if exists
  if (firstRow.articleContent) {
    articleData.content = firstRow.articleContent;
  }

  // Build stateHumanApprovedArray from all rows with human state assignments
  const humanStatesMap = new Map();
  for (const row of rawResults) {
    if (row.humanStateId && !humanStatesMap.has(row.humanStateId)) {
      humanStatesMap.set(row.humanStateId, {
        id: row.humanStateId,
        name: row.humanStateName,
      });
    }
  }

  if (humanStatesMap.size > 0) {
    articleData.stateHumanApprovedArray = Array.from(humanStatesMap.values());
  }

  // Build stateAiApproved from first row with AI state assignment
  if (firstRow.aiStateId) {
    articleData.stateAiApproved = {
      promptId: firstRow.aiPromptId,
      isHumanApproved: firstRow.aiIsHumanApproved,
      reasoning: firstRow.aiReasoning,
      state: {
        id: firstRow.aiStateId,
        name: firstRow.aiStateName,
      },
    };
  }

  return articleData;
}

module.exports = {
  createArticlesArrayWithSqlForSemanticKeywordsRating,
  createNewsApiRequestsArray,
  createArticlesApprovedArray,
  formatArticleDetails,
};
