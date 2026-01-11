const { sequelize } = require("newsnexus10db");
const logger = require("../logger");

/**
 * Query articles with their state assignments from ArticleStateContracts02
 * @param {Object} params - Query parameters
 * @param {boolean} params.includeNullState - If true, return articles with null stateId; if false, return only non-null
 * @returns {Promise<Array>} Array of articles with state assignment data
 */
async function sqlQueryArticlesWithStateAssignments({ includeNullState }) {
  const replacements = {};
  const whereClauses = [];

  // Filter based on includeNullState parameter
  if (includeNullState === true) {
    whereClauses.push(`asc02."stateId" IS NULL`);
  } else {
    whereClauses.push(`asc02."stateId" IS NOT NULL`);
  }

  const whereString =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const sql = `
    SELECT
      a.id AS "articleId",
      a.title,
      a.description,
      a.url,
      a."createdAt",
      asc02."promptId",
      asc02."isHumanApproved",
      asc02."isDeterminedToBeError",
      asc02."occuredInTheUS",
      asc02."reasoning",
      asc02."stateId",
      s.name AS "stateName"
    FROM "Articles" a
    INNER JOIN "ArticleStateContracts02" asc02 ON asc02."articleId" = a.id
    LEFT JOIN "States" s ON s.id = asc02."stateId"
    ${whereString}
    ORDER BY a."createdAt" DESC;
  `;

  logger.info(
    `Executing sqlQueryArticlesWithStateAssignments with includeNullState: ${includeNullState}`
  );

  const results = await sequelize.query(sql, {
    replacements,
    type: sequelize.QueryTypes.SELECT,
  });

  logger.info(`Found ${results.length} articles with state assignments`);

  return results;
}

module.exports = {
  sqlQueryArticlesWithStateAssignments,
};
