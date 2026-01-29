// Set environment variables FIRST, before any imports
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "NewsNexus10-02fcf999e576ce3b551d9860188d68f26cd2e5c88f0f1e59a6d46824c09744a589";
process.env.NAME_APP = "NewsNexusAPI-Test";
process.env.PATH_TO_LOGS = "./tests/logs";
// Use in-memory SQLite database for fast tests
process.env.PATH_DATABASE = ":memory:";
process.env.NAME_DB = "";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const {
  setupTestDatabase,
  seedArticlesWithRatingsData,
  closeTestDatabase,
} = require("./helpers/testDatabase");

// Mock only logger to reduce test output noise
jest.mock("../src/modules/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Mock the onStartUp module to prevent user creation on app start
jest.mock("../src/modules/onStartUp", () => ({
  onStartUpCreateEnvUsers: jest.fn(),
  verifyCheckDirectoryExists: jest.fn(),
}));

// Mock the globalSecurity middleware
jest.mock("../src/middleware/globalSecurity", () => ({
  globalSecurityMiddleware: (req, res, next) => next(),
}));

describe("POST /articles/with-ratings (Real Data)", () => {
  let app;
  let authToken;

  // Setup database before all tests
  beforeAll(async () => {
    // Initialize test database with in-memory SQLite
    await setupTestDatabase();

    // Seed with test data
    await seedArticlesWithRatingsData();

    // Generate real JWT token for authentication
    const mockUser = { id: 1, email: "test@example.com" };
    authToken = jwt.sign(mockUser, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Import app after database is set up
    app = require("../src/app");
  });

  // Close database after all tests
  afterAll(async () => {
    await closeTestDatabase();
  });

  describe("Response Structure Validation", () => {
    test("should return 200 status code", async () => {
      const response = await request(app)
        .post("/articles/with-ratings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          semanticScorerEntityName: "NewsNexusSemanticScorer02",
        });

      expect(response.status).toBe(200);
    });

    test("should return an object with articlesArray property", async () => {
      const response = await request(app)
        .post("/articles/with-ratings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          semanticScorerEntityName: "NewsNexusSemanticScorer02",
        });

      expect(response.body).toHaveProperty("articlesArray");
      expect(Array.isArray(response.body.articlesArray)).toBe(true);
    });

    test("should return articlesArray with 3 elements", async () => {
      const response = await request(app)
        .post("/articles/with-ratings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          semanticScorerEntityName: "NewsNexusSemanticScorer02",
        });

      expect(response.body.articlesArray).toHaveLength(3);
    });
  });

  describe("Article Element Property Validation", () => {
    let articlesArray;

    beforeAll(async () => {
      const response = await request(app)
        .post("/articles/with-ratings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          semanticScorerEntityName: "NewsNexusSemanticScorer02",
        });

      articlesArray = response.body.articlesArray;
    });

    describe("Required Core Properties", () => {
      test("all elements should have id property of type number", () => {
        articlesArray.forEach((article) => {
          expect(article).toHaveProperty("id");
          expect(typeof article.id).toBe("number");
        });
      });

      test("all elements should have title property of type string", () => {
        articlesArray.forEach((article) => {
          expect(article).toHaveProperty("title");
          expect(typeof article.title).toBe("string");
        });
      });

      test("all elements should have publicationName property of type string", () => {
        articlesArray.forEach((article) => {
          expect(article).toHaveProperty("publicationName");
          expect(typeof article.publicationName).toBe("string");
        });
      });

      test("all elements should have publishedDate property of type string", () => {
        articlesArray.forEach((article) => {
          expect(article).toHaveProperty("publishedDate");
          expect(typeof article.publishedDate).toBe("string");
        });
      });

      test("all elements should have description property of type string", () => {
        articlesArray.forEach((article) => {
          expect(article).toHaveProperty("description");
          expect(typeof article.description).toBe("string");
        });
      });

      test("all elements should have url property of type string", () => {
        articlesArray.forEach((article) => {
          expect(article).toHaveProperty("url");
          expect(typeof article.url).toBe("string");
        });
      });
    });

    describe("Optional Properties - Type Validation", () => {
      test("isApproved should be boolean or undefined", () => {
        articlesArray.forEach((article) => {
          if (article.isApproved !== undefined) {
            expect(typeof article.isApproved).toBe("boolean");
          }
        });
      });

      test("isBeingReviewed should be boolean or undefined", () => {
        articlesArray.forEach((article) => {
          if (article.isBeingReviewed !== undefined) {
            expect(typeof article.isBeingReviewed).toBe("boolean");
          }
        });
      });

      test("isRelevant should be boolean or undefined", () => {
        articlesArray.forEach((article) => {
          if (article.isRelevant !== undefined) {
            expect(typeof article.isRelevant).toBe("boolean");
          }
        });
      });

      test("statesStringCommaSeparated should be string or undefined", () => {
        articlesArray.forEach((article) => {
          if (article.statesStringCommaSeparated !== undefined) {
            expect(typeof article.statesStringCommaSeparated).toBe("string");
          }
        });
      });

      test("requestQueryString should be string or undefined", () => {
        articlesArray.forEach((article) => {
          if (article.requestQueryString !== undefined) {
            expect(typeof article.requestQueryString).toBe("string");
          }
        });
      });

      test("nameOfOrg should be string or undefined", () => {
        articlesArray.forEach((article) => {
          if (article.nameOfOrg !== undefined) {
            expect(typeof article.nameOfOrg).toBe("string");
          }
        });
      });

      test('semanticRatingMax should be number, string "N/A", or undefined', () => {
        articlesArray.forEach((article) => {
          if (article.semanticRatingMax !== undefined) {
            const isValidType =
              typeof article.semanticRatingMax === "number" ||
              article.semanticRatingMax === "N/A";
            expect(isValidType).toBe(true);
          }
        });
      });

      test('locationClassifierScore should be number, string "N/A", or undefined', () => {
        articlesArray.forEach((article) => {
          if (article.locationClassifierScore !== undefined) {
            const isValidType =
              typeof article.locationClassifierScore === "number" ||
              article.locationClassifierScore === "N/A";
            expect(isValidType).toBe(true);
          }
        });
      });

      test("States should be array or undefined", () => {
        articlesArray.forEach((article) => {
          if (article.States !== undefined) {
            expect(Array.isArray(article.States)).toBe(true);
          }
        });
      });
    });

    describe("States Array Structure Validation", () => {
      test("when States array exists, each state should have id (number) and name (string)", () => {
        articlesArray.forEach((article) => {
          if (article.States && article.States.length > 0) {
            article.States.forEach((state) => {
              expect(state).toHaveProperty("id");
              expect(typeof state.id).toBe("number");
              expect(state).toHaveProperty("name");
              expect(typeof state.name).toBe("string");
            });
          }
        });
      });
    });

    describe("Rating Values Range Validation", () => {
      test("semanticRatingMax when numeric should be between 0 and 1", () => {
        articlesArray.forEach((article) => {
          if (
            article.semanticRatingMax !== undefined &&
            typeof article.semanticRatingMax === "number"
          ) {
            expect(article.semanticRatingMax).toBeGreaterThanOrEqual(0);
            expect(article.semanticRatingMax).toBeLessThanOrEqual(1);
          }
        });
      });

      test("locationClassifierScore when numeric should be between 0 and 1", () => {
        articlesArray.forEach((article) => {
          if (
            article.locationClassifierScore !== undefined &&
            typeof article.locationClassifierScore === "number"
          ) {
            expect(article.locationClassifierScore).toBeGreaterThanOrEqual(0);
            expect(article.locationClassifierScore).toBeLessThanOrEqual(1);
          }
        });
      });
    });
  });

  describe("Authentication", () => {
    test("should return 401 without authentication token", async () => {
      const response = await request(app)
        .post("/articles/with-ratings")
        .send({
          semanticScorerEntityName: "NewsNexusSemanticScorer02",
        });

      expect(response.status).toBe(401);
    });

    test("should return 403 with invalid authentication token", async () => {
      const response = await request(app)
        .post("/articles/with-ratings")
        .set("Authorization", "Bearer invalid_token")
        .send({
          semanticScorerEntityName: "NewsNexusSemanticScorer02",
        });

      expect(response.status).toBe(403);
    });
  });

  describe("Specific Article Data Validation", () => {
    let articlesArray;

    beforeAll(async () => {
      const response = await request(app)
        .post("/articles/with-ratings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          semanticScorerEntityName: "NewsNexusSemanticScorer02",
        });

      articlesArray = response.body.articlesArray;
    });

    test("first article should have correct core properties", () => {
      const article = articlesArray[0];
      expect(article.id).toBe(1);
      expect(article.title).toBe("Test Article 1");
      expect(article.publicationName).toBe("Test Publication 1");
      expect(article.url).toBe("https://example.com/article1");
    });

    test("first article should have isApproved as true", () => {
      const article = articlesArray[0];
      expect(article.isApproved).toBe(true);
    });

    test("second article should have isRelevant as false", () => {
      const article = articlesArray[1];
      expect(article.isRelevant).toBe(false);
    });

    test("first article should have States array with 2 states", () => {
      const article = articlesArray[0];
      expect(article.States).toHaveLength(2);
      expect(article.States[0].name).toBe("California");
      expect(article.States[1].name).toBe("Texas");
    });

    test("first article should have semantic rating score", () => {
      const article = articlesArray[0];
      expect(article.semanticRatingMax).toBe(0.85);
    });

    test("first article should have location classifier score", () => {
      const article = articlesArray[0];
      expect(article.locationClassifierScore).toBe(0.91);
    });

    test("third article should have undefined semantic rating (no score in DB)", () => {
      const article = articlesArray[2];
      expect(article.semanticRatingMax).toBeUndefined();
    });

    test("second article should have correct nameOfOrg", () => {
      const article = articlesArray[1];
      expect(article.nameOfOrg).toBe("GNews");
    });
  });
});
