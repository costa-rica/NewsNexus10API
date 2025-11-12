const { sequelize } = require("newsnexus10db");

async function sqlQueryArticlesApprovedChatGptWithStatesApprovedReportContract() {
  const sql = `
    SELECT
      a.id AS "articleId",
      a.title,
      a.description,
      a.publishedDate,
      a.createdAt,
      a.publicationName,
      a.url,
      a.author,
      a.urlToImage,
      a.entityWhoFoundArticleId,
      a.newsApiRequestId,
      a.newsRssRequestId,
      s.id AS "stateId",
      s.name AS "stateName",
      s.abbreviation AS "stateAbbreviation",
      aa.id AS "approvedId",
      aa."artificialIntelligenceId" AS "approvedByAiId",
      aa."createdAt" AS "approvedAt",
      aa."isApproved",
      aa."headlineForPdfReport",
      aa."publicationNameForPdfReport",
      aa."publicationDateForPdfReport",
      aa."textForPdfReport",
      aa."urlForPdfReport",
      aa."kmNotes"
    FROM "Articles" a
    LEFT JOIN "ArticleStateContracts" asc ON a.id = asc."articleId"
    LEFT JOIN "States" s ON s.id = asc."stateId"
    LEFT JOIN "ArticlesApproved02" aa ON aa."articleId" = a.id
    ORDER BY a.id;
  `;

  const flatResults = await sequelize.query(sql, {
    type: sequelize.QueryTypes.SELECT,
  });

  const articlesMap = new Map();

  for (const row of flatResults) {
    const {
      articleId,
      title,
      description,
      publishedDate,
      createdAt,
      publicationName,
      url,
      author,
      urlToImage,
      entityWhoFoundArticleId,
      newsApiRequestId,
      newsRssRequestId,
      stateId,
      stateName,
      stateAbbreviation,
      approvedId,
      approvedByAiId,
      approvedAt,
      isApproved,
      headlineForPdfReport,
      publicationNameForPdfReport,
      publicationDateForPdfReport,
      textForPdfReport,
      urlForPdfReport,
      kmNotes,
    } = row;

    if (!articlesMap.has(articleId)) {
      articlesMap.set(articleId, {
        id: articleId,
        title,
        description,
        publishedDate,
        createdAt,
        publicationName,
        url,
        author,
        urlToImage,
        entityWhoFoundArticleId,
        newsApiRequestId,
        newsRssRequestId,
        States: [],
        ArticleApproveds: [],
      });
    }

    if (stateId) {
      const stateExists = articlesMap
        .get(articleId)
        .States.some((s) => s.id === stateId);
      if (!stateExists) {
        articlesMap.get(articleId).States.push({
          id: stateId,
          name: stateName,
          abbreviation: stateAbbreviation,
        });
      }
    }

    if (approvedId) {
      const approvedExists = articlesMap
        .get(articleId)
        .ArticleApproveds.some((a) => a.id === approvedId);
      if (!approvedExists) {
        articlesMap.get(articleId).ArticleApproveds.push({
          id: approvedId,
          artificialIntelligenceId: approvedByAiId,
          createdAt: approvedAt,
          isApproved,
          headlineForPdfReport,
          publicationNameForPdfReport,
          publicationDateForPdfReport,
          textForPdfReport,
          urlForPdfReport,
          kmNotes,
        });
      }
    }
  }

  return Array.from(articlesMap.values());
}

module.exports = {
  sqlQueryArticlesApprovedChatGptWithStatesApprovedReportContract,
};
