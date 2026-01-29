/**
 * Test Database Helper
 *
 * Sets up an in-memory SQLite database for testing
 * Provides utilities for seeding test data
 */

/**
 * Initialize the test database
 * - Creates all tables
 * - Sets up model associations
 */
async function setupTestDatabase() {
  // Import database package (uses in-memory DB via env vars)
  const { initModels, sequelize } = require("newsnexus10db");

  // Initialize models
  initModels();

  // Sync all tables (force: true recreates tables)
  await sequelize.sync({ force: true });

  return { initModels, sequelize };
}

/**
 * Seed the database with test data for articles-with-ratings endpoint
 */
async function seedArticlesWithRatingsData() {
  const {
    Article,
    State,
    ArticleApproved,
    ArticleIsRelevant,
    ArticleStateContract,
    NewsApiRequest,
    NewsArticleAggregatorSource,
    EntityWhoFoundArticle,
    ArtificialIntelligence,
    EntityWhoCategorizedArticle,
    ArticleEntityWhoCategorizedArticleContract,
    ArticleReviewed,
    User,
  } = require("newsnexus10db");

  // Create a test user
  const user = await User.create({
    id: 1,
    username: "testuser",
    email: "test@example.com",
    password: "hashed_password",
  });

  // Create EntityWhoFoundArticle for articles
  const entityWhoFound = await EntityWhoFoundArticle.create({
    id: 1,
    userId: user.id,
    name: "TestEntity",
  });

  // Create states
  const california = await State.create({ id: 1, name: "California", abbreviation: "CA" });
  const texas = await State.create({ id: 2, name: "Texas", abbreviation: "TX" });
  const newYork = await State.create({ id: 3, name: "New York", abbreviation: "NY" });

  // Create news aggregator sources
  const newsApiSource = await NewsArticleAggregatorSource.create({
    id: 1,
    nameOfOrg: "NewsAPI",
  });

  const gNewsSource = await NewsArticleAggregatorSource.create({
    id: 2,
    nameOfOrg: "GNews",
  });

  // Create NewsApiRequests
  const newsApiRequest1 = await NewsApiRequest.create({
    id: 1,
    andString: "safety",
    orString: null,
    notString: null,
    newsArticleAggregatorSourceId: newsApiSource.id,
  });

  const newsApiRequest2 = await NewsApiRequest.create({
    id: 2,
    andString: "hazard",
    orString: "danger",
    notString: "safe",
    newsArticleAggregatorSourceId: gNewsSource.id,
  });

  const newsApiRequest3 = await NewsApiRequest.create({
    id: 3,
    andString: null,
    orString: null,
    notString: null,
    newsArticleAggregatorSourceId: newsApiSource.id, // Changed from null to valid ID
  });

  // Create AI entities
  const semanticScorer = await ArtificialIntelligence.create({
    id: 1,
    name: "NewsNexusSemanticScorer02",
  });

  const locationScorer = await ArtificialIntelligence.create({
    id: 2,
    name: "NewsNexusClassifierLocationScorer01",
  });

  // Create EntityWhoCategorizedArticle for each AI
  const entitySemanticScorer = await EntityWhoCategorizedArticle.create({
    id: 1,
    artificialIntelligenceId: semanticScorer.id,
    name: "SemanticScorerEntity",
  });

  const entityLocationScorer = await EntityWhoCategorizedArticle.create({
    id: 2,
    artificialIntelligenceId: locationScorer.id,
    name: "LocationScorerEntity",
  });

  // Create Article 1 - Approved with 2 states
  const article1 = await Article.create({
    id: 1,
    title: "Test Article 1",
    description: "Description for article 1",
    publishedDate: "2025-01-15T10:00:00.000Z",
    publicationName: "Test Publication 1",
    url: "https://example.com/article1",
    entityWhoFoundArticleId: entityWhoFound.id,
    newsApiRequestId: newsApiRequest1.id,
  });

  await ArticleStateContract.create({ articleId: article1.id, stateId: california.id });
  await ArticleStateContract.create({ articleId: article1.id, stateId: texas.id });

  await ArticleApproved.create({
    articleId: article1.id,
    userId: user.id,
    isApproved: 1,
  });

  await ArticleReviewed.create({
    articleId: article1.id,
    userId: user.id,
  });

  // Add AI scores for article 1
  await ArticleEntityWhoCategorizedArticleContract.create({
    articleId: article1.id,
    entityWhoCategorizesId: entitySemanticScorer.id, // Fixed: was entityWhoCategorizedArticleId
    keyword: "consumer safety hazard",
    keywordRating: 0.85,
  });

  await ArticleEntityWhoCategorizedArticleContract.create({
    articleId: article1.id,
    entityWhoCategorizesId: entityLocationScorer.id, // Fixed: was entityWhoCategorizedArticleId
    keyword: "California location",
    keywordRating: 0.91,
  });

  // Create Article 2 - Not relevant, not approved
  const article2 = await Article.create({
    id: 2,
    title: "Test Article 2",
    description: "Description for article 2",
    publishedDate: "2025-01-16T12:00:00.000Z",
    publicationName: "Test Publication 2",
    url: "https://example.com/article2",
    entityWhoFoundArticleId: entityWhoFound.id,
    newsApiRequestId: newsApiRequest2.id,
  });

  await ArticleIsRelevant.create({
    articleId: article2.id,
    userId: user.id,
    isRelevant: 0,
  });

  // Add AI scores for article 2
  await ArticleEntityWhoCategorizedArticleContract.create({
    articleId: article2.id,
    entityWhoCategorizesId: entitySemanticScorer.id, // Fixed: was entityWhoCategorizedArticleId
    keyword: "product danger",
    keywordRating: 0.72,
  });

  await ArticleEntityWhoCategorizedArticleContract.create({
    articleId: article2.id,
    entityWhoCategorizesId: entityLocationScorer.id, // Fixed: was entityWhoCategorizedArticleId
    keyword: "General location",
    keywordRating: 0.65,
  });

  // Create Article 3 - One state, not approved
  const article3 = await Article.create({
    id: 3,
    title: "Test Article 3",
    description: "Description for article 3",
    publishedDate: "2025-01-17T14:00:00.000Z",
    publicationName: "Test Publication 3",
    url: "https://example.com/article3",
    entityWhoFoundArticleId: entityWhoFound.id,
    newsApiRequestId: newsApiRequest3.id,
  });

  await ArticleStateContract.create({ articleId: article3.id, stateId: newYork.id });

  // Add AI scores for article 3 (note: no semantic score, has location score)
  await ArticleEntityWhoCategorizedArticleContract.create({
    articleId: article3.id,
    entityWhoCategorizesId: entityLocationScorer.id, // Fixed: was entityWhoCategorizedArticleId
    keyword: "New York location",
    keywordRating: 0.43,
  });
}

/**
 * Close the test database connection
 */
async function closeTestDatabase() {
  const { sequelize } = require("newsnexus10db");
  await sequelize.close();
}

module.exports = {
  setupTestDatabase,
  seedArticlesWithRatingsData,
  closeTestDatabase,
};
