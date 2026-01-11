# API Reference - News Nexus 10 API Articles

This document provides comprehensive documentation for all article management endpoints in the News Nexus 10 API service.

## Articles Endpoints

All article endpoints are prefixed with `/articles` and handle article retrieval, filtering, and approval management for the CPSC consumer product safety monitoring system.

---

## POST /articles

Retrieves a filtered list of articles based on optional query parameters. Returns articles enriched with state associations, relevance status, and approval information. Supports filtering by publication date, approval status, and relevance.

**Authentication:** Required (JWT token)

**URL Parameters:** None

**Request Body:**

```json
{
  "returnOnlyThisPublishedDateOrAfter": "2025-01-01",
  "returnOnlyIsNotApproved": true,
  "returnOnlyIsRelevant": true
}
```

**Request Body Fields:**

| Field                              | Type    | Required | Description                                                                                     |
| ---------------------------------- | ------- | -------- | ----------------------------------------------------------------------------------------------- |
| returnOnlyThisPublishedDateOrAfter | string  | No       | ISO 8601 date - only return articles published on or after this date                            |
| returnOnlyIsNotApproved            | boolean | No       | If true, only return articles that have NOT been approved                                       |
| returnOnlyIsRelevant               | boolean | No       | If true, only return articles marked as relevant (excludes articles in ArticleIsRelevant table) |

**Description:**

This endpoint provides a comprehensive view of articles with rich metadata for review workflows. It queries the database for articles, enriches them with related data (states, relevance, approval status), and applies optional filters based on the request parameters.

**Process Flow:**

1. Queries articles from database, optionally filtered by publication date
2. Queries and maps related data:
   - States associated with each article
   - Relevance markers (ArticleIsRelevant table)
   - Approval status (ArticleApproveds table)
3. Constructs enriched article objects with:
   - Basic article fields (title, description, url, publishedDate)
   - Associated states array and comma-separated state abbreviations
   - Relevance flag (`ArticleIsRelevant`)
   - Approval flag (`articleIsApproved`)
   - Keyword search terms from NewsApiRequest
4. Applies filters based on request body parameters
5. Returns filtered array of enriched articles

**Response (200 OK - Success):**

```json
{
  "articlesArray": [
    {
      "id": 128450,
      "title": "Consumer Product Safety Alert: Defective Space Heaters Recalled",
      "description": "The CPSC announced a recall of electric space heaters due to fire hazard...",
      "publishedDate": "2025-11-07T14:30:00.000Z",
      "url": "https://example.com/news/space-heater-recall",
      "States": [
        {
          "id": 5,
          "name": "California",
          "abbreviation": "CA"
        }
      ],
      "statesStringCommaSeparated": "CA",
      "ArticleIsRelevant": true,
      "articleIsApproved": false,
      "keyword": "AND space heater OR electric heater NOT gas",
      "NewsApiRequest": {
        "andString": "space heater",
        "orString": "electric heater",
        "notString": "gas"
      }
    },
    {
      "id": 128449,
      "title": "Battery Explosion Injures Two",
      "description": "A lithium-ion battery exploded while charging...",
      "publishedDate": "2025-11-07T12:00:00.000Z",
      "url": "https://example.com/news/battery-explosion",
      "States": [
        {
          "id": 5,
          "name": "California",
          "abbreviation": "CA"
        },
        {
          "id": 36,
          "name": "New York",
          "abbreviation": "NY"
        }
      ],
      "statesStringCommaSeparated": "CA, NY",
      "ArticleIsRelevant": true,
      "articleIsApproved": true,
      "keyword": "AND battery OR lithium",
      "NewsApiRequest": {
        "andString": "battery",
        "orString": "lithium",
        "notString": null
      }
    }
  ]
}
```

**Response (401 Unauthorized - Missing Token):**

```json
{
  "message": "Token is required"
}
```

**Response (403 Forbidden - Invalid Token):**

```json
{
  "message": "Invalid token"
}
```

**Example (Get All Articles):**

```bash
curl -X POST http://localhost:8001/articles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Example (Get Unapproved Articles from Last Week):**

```bash
curl -X POST http://localhost:8001/articles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "returnOnlyThisPublishedDateOrAfter": "2025-11-01",
    "returnOnlyIsNotApproved": true,
    "returnOnlyIsRelevant": true
  }'
```

**Article Object Fields:**

| Field                      | Type    | Description                                                       |
| -------------------------- | ------- | ----------------------------------------------------------------- |
| id                         | number  | Unique article identifier                                         |
| title                      | string  | Article headline                                                  |
| description                | string  | Article summary or excerpt                                        |
| publishedDate              | string  | ISO 8601 timestamp when article was published                     |
| url                        | string  | Full URL to the article source                                    |
| States                     | array   | Array of state objects associated with this article               |
| statesStringCommaSeparated | string  | Comma-separated state abbreviations (e.g., "CA, NY")              |
| ArticleIsRelevant          | boolean | true if article is relevant (false if in ArticleIsRelevant table) |
| articleIsApproved          | boolean | true if article has ANY row in ArticleApproveds table             |
| keyword                    | string  | Formatted search keywords used to find this article               |
| NewsApiRequest             | object  | Original search parameters (andString, orString, notString)       |

**Filter Behavior:**

1. **returnOnlyThisPublishedDateOrAfter**: Applied at database query level for performance
2. **returnOnlyIsNotApproved**: Filters out articles with `articleIsApproved=true`
3. **returnOnlyIsRelevant**: Filters out articles with `ArticleIsRelevant=false`

**Important Notes:**

- `ArticleIsRelevant=true` means the article IS relevant (default state)
- `ArticleIsRelevant=false` means the article has been explicitly marked as NOT relevant
- `articleIsApproved=true` means the article has ANY entry in ArticleApproveds table (regardless of isApproved value)
- **Note:** This endpoint does NOT check the `isApproved` field value in ArticleApproveds - it only checks for presence of a row
- Multiple states can be associated with a single article
- The `keyword` field is constructed from NewsApiRequest search parameters

**Performance Notes:**

- Returns raw article count before filtering in console logs
- Typical response time: < 2 seconds for 10,000+ articles
- Uses Map data structures for efficient related data lookup
- State and approval data is pre-fetched and mapped for performance

**Use Cases:**

1. **Review Dashboard**: Get all unapproved relevant articles for manual review
2. **Date-Range Analysis**: Filter articles by publication date for periodic review
3. **State Monitoring**: View all articles associated with specific states
4. **Workflow Management**: Track approval status across article collections

**Related Files:**

- Route Implementation: `src/routes/articles.js`
- Query Functions: `src/modules/queriesSql.js`
- Related Tables: Articles, States, ArticleApproveds, ArticleIsRelevant, ArticleStateContracts

**Related Endpoints:**

- `GET /articles/approved` - Get only approved articles
- `POST /analysis/llm02/update-approved-status` - Update article approval status
- `GET /analysis/llm02/no-article-approved-rows` - Get articles without approval records

---

## GET /articles/approved

Retrieves all approved articles for display in the Portal application. Returns only articles with `isApproved=true` in the ArticleApproveds table, enriched with state information, submission status, and CPSC acceptance status.

**Authentication:** Required (JWT token)

**URL Parameters:** None

**Query Parameters:** None

**Description:**

This endpoint provides a curated list of approved articles for the Portal application. It filters articles to ensure only those with explicit approval (`isApproved=true`) are returned, along with metadata about their submission to reports and CPSC acceptance status.

**Process Flow:**

1. Queries articles with states, approvals, and report contracts
2. Filters for articles where `ArticleApproveds.isApproved === true` or `=== 1`
3. Enriches each article with:
   - `isSubmitted`: "Yes" if article is in any report, "No" otherwise
   - `articleHasBeenAcceptedByAll`: true if all associated reports have been accepted by CPSC
   - `stateAbbreviation`: Comma-separated state abbreviations
4. Returns approved articles array with performance timing

**Response (200 OK - Success):**

```json
{
  "articlesArray": [
    {
      "id": 128450,
      "title": "Consumer Product Safety Alert: Defective Space Heaters Recalled",
      "description": "The CPSC announced a recall of electric space heaters...",
      "url": "https://example.com/news/space-heater-recall",
      "urlToImage": "https://example.com/images/heater.jpg",
      "publishedDate": "2025-11-07T14:30:00.000Z",
      "createdAt": "2025-11-08T10:15:23.456Z",
      "updatedAt": "2025-11-08T10:15:23.456Z",
      "States": [
        {
          "id": 5,
          "name": "California",
          "abbreviation": "CA"
        }
      ],
      "stateAbbreviation": "CA",
      "ArticleApproveds": [
        {
          "id": 789,
          "userId": 1,
          "articleId": 128450,
          "isApproved": true,
          "textForPdfReport": "Electric space heater recall due to fire hazard",
          "createdAt": "2025-11-08T11:00:00.000Z"
        }
      ],
      "ArticleReportContracts": [
        {
          "id": 456,
          "articleId": 128450,
          "reportId": 23,
          "articleAcceptedByCpsc": 1
        }
      ],
      "isSubmitted": "Yes",
      "articleHasBeenAcceptedByAll": true
    },
    {
      "id": 128449,
      "title": "Battery Explosion Injures Two",
      "description": "A lithium-ion battery exploded while charging...",
      "url": "https://example.com/news/battery-explosion",
      "urlToImage": "https://example.com/images/battery.jpg",
      "publishedDate": "2025-11-07T12:00:00.000Z",
      "createdAt": "2025-11-08T09:45:12.789Z",
      "updatedAt": "2025-11-08T09:45:12.789Z",
      "States": [
        {
          "id": 5,
          "name": "California",
          "abbreviation": "CA"
        },
        {
          "id": 36,
          "name": "New York",
          "abbreviation": "NY"
        }
      ],
      "stateAbbreviation": "CA, NY",
      "ArticleApproveds": [
        {
          "id": 788,
          "userId": 1,
          "articleId": 128449,
          "isApproved": true,
          "textForPdfReport": "Lithium battery explosion incident",
          "createdAt": "2025-11-08T10:30:00.000Z"
        }
      ],
      "ArticleReportContracts": [],
      "isSubmitted": "No",
      "articleHasBeenAcceptedByAll": false
    }
  ],
  "timeToRenderResponseFromApiInSeconds": 1.234
}
```

**Response (401 Unauthorized - Missing Token):**

```json
{
  "message": "Token is required"
}
```

**Response (403 Forbidden - Invalid Token):**

```json
{
  "message": "Invalid token"
}
```

**Example:**

```bash
curl -X GET http://localhost:8001/articles/approved \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Article Object Fields:**

| Field                       | Type    | Description                                               |
| --------------------------- | ------- | --------------------------------------------------------- |
| id                          | number  | Unique article identifier                                 |
| title                       | string  | Article headline                                          |
| description                 | string  | Article summary or excerpt                                |
| url                         | string  | Full URL to the article source                            |
| urlToImage                  | string  | URL to article's featured image (may be null)             |
| publishedDate               | string  | ISO 8601 timestamp when article was published             |
| createdAt                   | string  | ISO 8601 timestamp when article was added to database     |
| updatedAt                   | string  | ISO 8601 timestamp of last update                         |
| States                      | array   | Array of state objects associated with this article       |
| stateAbbreviation           | string  | Comma-separated state abbreviations (e.g., "CA, NY")      |
| ArticleApproveds            | array   | Array of approval records (only includes isApproved=true) |
| ArticleReportContracts      | array   | Array of report associations                              |
| isSubmitted                 | string  | "Yes" if in any report, "No" otherwise                    |
| articleHasBeenAcceptedByAll | boolean | true if all associated reports accepted by CPSC           |

**Approval Filtering Logic:**

The endpoint uses this filter to ensure only approved articles are returned:

```javascript
article.ArticleApproveds?.some(
  (entry) => entry.isApproved === true || entry.isApproved === 1
);
```

**Key Points:**

- Articles with `isApproved=false` entries are **excluded**
- Articles must have **at least one** `isApproved=true` entry
- Handles both boolean (`true`) and integer (`1`) representations
- **Future-proof**: Works correctly with the new approval workflow where ArticleApproveds can have `isApproved=false`

**isSubmitted Field:**

- Set to `"Yes"` if `ArticleReportContracts.length > 0`
- Set to `"No"` if `ArticleReportContracts.length === 0`
- Indicates whether the article has been included in any report

**articleHasBeenAcceptedByAll Field:**

- `true` if ALL associated reports have `articleAcceptedByCpsc === 1`
- `false` if ANY associated report has `articleAcceptedByCpsc !== 1`
- Only relevant when `isSubmitted === "Yes"`

**stateAbbreviation Field:**

- Single state: `"CA"`
- Multiple states: `"CA, NY, TX"`
- No states: `""`

**Performance Notes:**

- Includes `timeToRenderResponseFromApiInSeconds` in response
- Logs article count before and after filtering to console
- Typical response time: < 2 seconds for 1,000+ approved articles
- Uses SQL query optimization for related data

**Use Cases:**

1. **Portal Display**: Primary endpoint for Portal app to display approved articles
2. **Report Generation**: Get approved articles for inclusion in CPSC reports
3. **Tracking Submissions**: Monitor which approved articles have been submitted to reports
4. **CPSC Acceptance**: Track which articles have been accepted by CPSC

**Integration Example:**

Portal applications typically use this endpoint to populate article dashboards:

```javascript
const response = await fetch("http://localhost:8001/articles/approved", {
  headers: { Authorization: `Bearer ${token}` },
});

const { articlesArray, timeToRenderResponseFromApiInSeconds } =
  await response.json();

// Filter for unsubmitted approved articles
const unsubmittedArticles = articlesArray.filter(
  (article) => article.isSubmitted === "No"
);

// Filter for articles pending CPSC acceptance
const pendingAcceptance = articlesArray.filter(
  (article) =>
    article.isSubmitted === "Yes" && !article.articleHasBeenAcceptedByAll
);
```

**Important Notes:**

- **Only returns articles with `isApproved=true`** - articles with only `isApproved=false` entries are excluded
- This is critical for the new approval workflow where ArticleApproveds can contain rejections
- Articles can have multiple approval records from different users/entities
- The endpoint checks for **at least one** `isApproved=true` entry
- State abbreviations are formatted for easy display in UI

**Related Files:**

- Route Implementation: `src/routes/articles.js`
- Query Function: `src/modules/queriesSql.js` - `sqlQueryArticlesWithStatesApprovedReportContract()`
- Related Tables: Articles, ArticleApproveds, States, ArticleReportContracts

**Related Endpoints:**

- `POST /articles` - Get filtered articles (includes unapproved)
- `POST /articles/update-approved` - Update approval text for reports
- `POST /analysis/llm02/update-approved-status` - Update article approval status

---

## POST /articles/user-toggle-is-not-relevant/:articleId

Toggles the relevance status of an article by creating or deleting a record in the ArticleIsRelevant table. This endpoint uses a toggle pattern where the presence of a record indicates "NOT relevant" and absence indicates "relevant" (default state).

**Authentication:** Required (JWT token)

**URL Parameters:**

| Parameter | Type   | Required | Description                           |
| --------- | ------ | -------- | ------------------------------------- |
| articleId | number | Yes      | ID of the article to toggle relevance |

**Request Body:** None (empty)

**Description:**

This endpoint manages article relevance through a toggle mechanism. Articles are considered relevant by default (no record in ArticleIsRelevant table). When a user marks an article as "NOT relevant," a record is created with `isRelevant=false`. Toggling again removes the record, making the article relevant again.

**Process Flow:**

1. Checks if an ArticleIsRelevant record exists for this articleId
2. **If record exists:**
   - Deletes the record
   - Article becomes relevant (returns to default state)
   - Returns `articleIsRelevant=true`
3. **If no record exists:**
   - Creates new record with `isRelevant=false` and `userId` from JWT
   - Article is marked as NOT relevant
   - Returns `articleIsRelevant=false`

**Response (200 OK - Marked as NOT Relevant):**

```json
{
  "result": true,
  "status": "articleId 12345 is marked as NOT relevant",
  "articleIsRelevant": false
}
```

**Response (200 OK - Made Relevant):**

```json
{
  "result": true,
  "status": "articleId 12345 is made relevant",
  "articleIsRelevant": true
}
```

**Response (401 Unauthorized - Missing Token):**

```json
{
  "message": "Token is required"
}
```

**Response (403 Forbidden - Invalid Token):**

```json
{
  "message": "Invalid token"
}
```

**Example (Toggle Relevance):**

```bash
curl -X POST http://localhost:8001/articles/user-toggle-is-not-relevant/12345 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Relevance State Logic:**

| Current State | ArticleIsRelevant Record | Action | New State    | Record After                         |
| ------------- | ------------------------ | ------ | ------------ | ------------------------------------ |
| Relevant      | No record                | Toggle | NOT Relevant | Record created with isRelevant=false |
| NOT Relevant  | Record exists            | Toggle | Relevant     | Record deleted                       |

**Important Notes:**

- **Default state is relevant**: Articles without a record in ArticleIsRelevant are considered relevant
- **Inverse logic**: Record presence = NOT relevant, record absence = relevant
- Tracks which user marked article as not relevant via `userId` field
- Multiple toggles will alternate between relevant and NOT relevant states
- Used by POST /articles endpoint's `returnOnlyIsRelevant` filter

**Use Cases:**

1. **Filtering Irrelevant Articles**: Users mark off-topic or spam articles as NOT relevant
2. **Quality Control**: Remove low-quality articles from review workflows
3. **Workflow Management**: Hide irrelevant articles from approval dashboards
4. **User Preferences**: Allow users to customize which articles they see

**Integration with Other Endpoints:**

The relevance status affects these endpoints:

- **POST /articles**: `returnOnlyIsRelevant=true` filters out articles marked as NOT relevant
- Article objects include `ArticleIsRelevant` boolean field based on record presence

**Integration Example:**

```javascript
// Toggle article relevance
const toggleRelevance = async (articleId) => {
  const response = await fetch(
    `http://localhost:8001/articles/user-toggle-is-not-relevant/${articleId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  );

  const { articleIsRelevant, status } = await response.json();
  logger.info(status);

  return articleIsRelevant;
};
```

**Related Files:**

- Route Implementation: `src/routes/articles.js:275-304`
- Related Table: ArticleIsRelevant

**Related Endpoints:**

- `POST /articles` - Respects relevance filter
- `GET /articles/approved` - Approved articles may still be marked as NOT relevant

---

## GET /articles/get-approved/:articleId

Retrieves approval information for a specific article, including the article data, states, and PDF report content. Returns whether the article has any approval record in the ArticleApproveds table.

**Authentication:** Required (JWT token)

**URL Parameters:**

| Parameter | Type   | Required | Description                           |
| --------- | ------ | -------- | ------------------------------------- |
| articleId | number | Yes      | ID of the article to get approval for |

**Request Body:** None

**Description:**

This endpoint fetches detailed information about an article's approval status, including associated states, relevance markers, and the text prepared for PDF reports. It returns the complete article object with related data for display in approval workflows.

**Process Flow:**

1. Queries ArticleApproveds table for the articleId
2. Includes related Article data with States and ArticleIsRelevant records
3. **If no approval record exists:**
   - Returns `articleIsApproved=false` with empty article object
4. **If approval record exists:**
   - Returns `articleIsApproved=true`
   - Returns full article data
   - Returns `textForPdfReport` content
   - Returns associated States

**Response (200 OK - Article Has Approval Record):**

```json
{
  "articleIsApproved": true,
  "article": {
    "id": 12345,
    "title": "Electric Scooter Recall Announced",
    "description": "The CPSC announced a recall of electric scooters...",
    "url": "https://example.com/news/scooter-recall",
    "urlToImage": "https://example.com/images/scooter.jpg",
    "publishedDate": "2025-11-07T14:30:00.000Z",
    "createdAt": "2025-11-08T10:15:23.456Z",
    "updatedAt": "2025-11-08T10:15:23.456Z",
    "States": [
      {
        "id": 5,
        "name": "California",
        "abbreviation": "CA"
      }
    ],
    "ArticleIsRelevants": []
  },
  "content": "Electric scooter recall due to fire hazard in California",
  "States": [
    {
      "id": 5,
      "name": "California",
      "abbreviation": "CA"
    }
  ]
}
```

**Response (200 OK - No Approval Record):**

```json
{
  "articleIsApproved": false,
  "article": {}
}
```

**Response (401 Unauthorized - Missing Token):**

```json
{
  "message": "Token is required"
}
```

**Response (403 Forbidden - Invalid Token):**

```json
{
  "message": "Invalid token"
}
```

**Example:**

```bash
curl -X GET http://localhost:8001/articles/get-approved/12345 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response Fields:**

| Field             | Type    | Description                                                      |
| ----------------- | ------- | ---------------------------------------------------------------- |
| articleIsApproved | boolean | true only if ArticleApproveds record exists with isApproved=true |
| article           | object  | Complete article data with States and ArticleIsRelevants         |
| content           | string  | Text prepared for PDF reports (textForPdfReport field)           |
| States            | array   | Duplicate of article.States for convenience                      |

**Approval Checking Logic:**

This endpoint properly validates the approval status by checking both record existence and the `isApproved` field value:

```javascript
const articleApproved = await ArticleApproved.findOne({
  where: { articleId }
});

// Check if record exists AND isApproved is true
if (!articleApproved || (articleApproved.isApproved !== true && articleApproved.isApproved !== 1)) {
  return res.json({ articleIsApproved: false, article: {} });
}

res.json({ articleIsApproved: true, ... });
```

**This ensures:**

- ✅ Articles with `isApproved=false` return `articleIsApproved=false`
- ✅ Aligns with the new approval workflow
- ✅ Consistent with `GET /articles/approved` endpoint behavior
- ✅ Handles both boolean (`true`) and integer (`1`) representations

**Use Cases:**

1. **Approval Status Check**: Quick lookup to see if article has been reviewed
2. **Edit Approval**: Get current approval data for editing in Portal
3. **Report Preview**: Display approved article with PDF report text
4. **State Association**: View which states are associated with approved article

**Integration Example:**

```javascript
// Get approval information for an article
const getApprovalInfo = async (articleId) => {
  const response = await fetch(
    `http://localhost:8001/articles/get-approved/${articleId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const { articleIsApproved, article, content, States } = await response.json();

  if (articleIsApproved) {
    logger.info("Article is approved");
    logger.info("PDF Report Text:", content);
    logger.info("States:", States.map((s) => s.abbreviation).join(", "));
  } else {
    logger.info("Article is not approved");
  }

  return { articleIsApproved, article, content, States };
};
```

**Related Files:**

- Route Implementation: `src/routes/articles.js:306-339`
- Related Tables: ArticleApproveds, Articles, States, ArticleIsRelevant

**Related Endpoints:**

- `POST /articles/approve/:articleId` - Approve/unapprove articles
- `GET /articles/approved` - Get all approved articles (filters by isApproved=true)
- `POST /articles/update-approved` - Update PDF report text

---

## POST /articles/approve/:articleId

Approves or unapproves an article by creating or updating a record in the ArticleApproveds table. This endpoint maintains approval history by setting `isApproved=true` or `isApproved=false` rather than deleting records. Tracks which user performed each action via JWT token.

**Authentication:** Required (JWT token)

**URL Parameters:**

| Parameter | Type   | Required | Description                            |
| --------- | ------ | -------- | -------------------------------------- |
| articleId | number | Yes      | ID of the article to approve/unapprove |

**Request Body:**

```json
{
  "approvedStatus": "Approve",
  "headlineForPdfReport": "Electric Scooter Recall Announced",
  "publicationNameForPdfReport": "Consumer Safety News",
  "publicationDateForPdfReport": "2025-11-07",
  "textForPdfReport": "Electric scooter recall due to fire hazard",
  "urlForPdfReport": "https://example.com/news/scooter-recall"
}
```

**Request Body Fields:**

| Field                       | Type   | Required | Description                          |
| --------------------------- | ------ | -------- | ------------------------------------ |
| approvedStatus              | string | Yes      | "Approve" or "Un-approve"            |
| headlineForPdfReport        | string | No       | Headline to use in PDF reports       |
| publicationNameForPdfReport | string | No       | Publication name for PDF reports     |
| publicationDateForPdfReport | string | No       | Publication date for PDF reports     |
| textForPdfReport            | string | No       | Article text/summary for PDF reports |
| urlForPdfReport             | string | No       | Article URL for PDF reports          |

**Description:**

This endpoint manages article approval status with full history tracking. When approving or unapproving, it updates the ArticleApproveds table by setting the `isApproved` field and tracking which user performed the action. This approach maintains a complete audit trail of approval decisions.

**Process Flow:**

### Approve Action (`approvedStatus === "Approve"`):

1. Checks if an ArticleApproveds record exists for this article
2. **If record exists:**
   - Updates record with `isApproved=true`
   - Updates `userId` to current authenticated user
   - Updates all provided PDF report fields
3. **If no record exists:**
   - Creates new record with `isApproved=true`
   - Sets `userId` to current authenticated user
   - Includes all provided PDF report fields

### Un-approve Action (`approvedStatus === "Un-approve"`):

1. Checks if an ArticleApproveds record exists for this article
2. **If record exists:**
   - Updates record with `isApproved=false`
   - Updates `userId` to current authenticated user (tracks who unapproved)
   - Maintains all other fields (preserves approval history)
3. **If no record exists:**
   - Logs warning that no record exists to unapprove
   - No database operation performed

**Response (200 OK - Approve):**

```json
{
  "result": true,
  "status": "articleId 12345 is approved"
}
```

**Response (200 OK - Un-approve):**

```json
{
  "result": true,
  "status": "articleId 12345 is unapproved"
}
```

**Response (401 Unauthorized - Missing Token):**

```json
{
  "message": "Token is required"
}
```

**Response (403 Forbidden - Invalid Token):**

```json
{
  "message": "Invalid token"
}
```

**Example (Approve Article):**

```bash
curl -X POST http://localhost:8001/articles/approve/12345 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approvedStatus": "Approve",
    "headlineForPdfReport": "Electric Scooter Recall Announced",
    "publicationNameForPdfReport": "Consumer Safety News",
    "publicationDateForPdfReport": "2025-11-07",
    "textForPdfReport": "Electric scooter recall due to fire hazard in California",
    "urlForPdfReport": "https://example.com/news/scooter-recall"
  }'
```

**Example (Un-approve Article):**

```bash
curl -X POST http://localhost:8001/articles/approve/12345 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approvedStatus": "Un-approve"
  }'
```

**Database Behavior:**

| Action     | Record Exists | Operation                                  | Fields Updated                          |
| ---------- | ------------- | ------------------------------------------ | --------------------------------------- |
| Approve    | No            | Create new record                          | isApproved=true, userId, all PDF fields |
| Approve    | Yes           | Update existing record                     | isApproved=true, userId, all PDF fields |
| Un-approve | Yes           | Update existing record (preserves history) | isApproved=false, userId                |
| Un-approve | No            | No operation (logs warning)                | None                                    |

**Important Workflow Changes:**

- **No longer deletes records** when unapproving
- **Maintains approval history** by keeping records with `isApproved=false`
- **Tracks user actions** via `userId` field from JWT token
- **Supports re-approval** by updating existing records back to `isApproved=true`

**Approval History Tracking:**

This endpoint now maintains a complete audit trail:

1. Article initially approved by User A → Record created with `isApproved=true`, `userId=A`
2. Article unapproved by User B → Record updated to `isApproved=false`, `userId=B`
3. Article re-approved by User C → Record updated to `isApproved=true`, `userId=C`

The `userId` field always reflects who performed the most recent action, and the `isApproved` field reflects the current approval state.

**Console Logging:**

The endpoint logs detailed information for debugging:

- Approve (existing record): `"---- > updated existing record to approved for articleId 12345"`
- Approve (new record): `"---- > created new approval record for articleId 12345"`
- Un-approve (success): `"---- > updated record to unapproved for articleId 12345, userId: 5"`
- Un-approve (no record): `"---- > no approval record exists for articleId 12345, cannot unapprove"`

**Compatibility:**

✅ **GET /articles/approved** - Still works correctly (filters for `isApproved=true` only)
✅ **Portal Application** - Only displays approved articles (isApproved=true)
✅ **Approval History** - Complete audit trail maintained in database
✅ **User Tracking** - Know who approved/unapproved each article

**Use Cases:**

1. **Manual Review Approval**: User reviews article and approves it for inclusion in reports
2. **Mistake Correction**: User can unapprove an article that was approved by mistake
3. **Re-evaluation**: Article can be unapproved, reviewed again, and re-approved
4. **Audit Trail**: Track complete history of approval decisions and which users made them

**Integration Example:**

Portal applications typically use this endpoint after manual article review:

```javascript
// Approve article after user review
const approveArticle = async (articleId, articleData) => {
  const response = await fetch(
    `http://localhost:8001/articles/approve/${articleId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        approvedStatus: "Approve",
        headlineForPdfReport: articleData.title,
        textForPdfReport: articleData.summary,
        urlForPdfReport: articleData.url,
        publicationNameForPdfReport: articleData.source,
        publicationDateForPdfReport: articleData.publishedDate,
      }),
    }
  );

  return response.json();
};

// Unapprove article if needed
const unapproveArticle = async (articleId) => {
  const response = await fetch(
    `http://localhost:8001/articles/approve/${articleId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        approvedStatus: "Un-approve",
      }),
    }
  );

  return response.json();
};
```

**Important Notes:**

- The `userId` field is automatically populated from the JWT token's authenticated user
- All PDF report fields are optional when approving
- When unapproving, only `isApproved` and `userId` are updated (other fields preserved)
- The spread operator `...req.body` includes all provided fields in the approval record
- Records are never deleted, only updated, ensuring complete approval history

**Related Files:**

- Route Implementation: `src/routes/articles.js:341-402`
- Related Table: ArticleApproveds

**Related Endpoints:**

- `GET /articles/approved` - Get only approved articles (isApproved=true)
- `POST /articles/update-approved` - Update approval text for reports
- `POST /analysis/llm02/update-approved-status` - AI-based approval workflow

---

## GET /articles/summary-statistics

Retrieves summary statistics about articles in the system, including total counts, articles with states, approved articles, and approved articles not yet submitted to reports. Provides dashboard metrics for monitoring the article processing workflow.

**Authentication:** Required (JWT token)

**URL Parameters:** None

**Query Parameters:** None

**Description:**

This endpoint calculates and returns various statistics about the article database to provide insights into the workflow status. It includes counts of total articles, recent articles, articles with state associations, approved articles, and approved articles awaiting report submission.

**Process Flow:**

1. Queries all articles and counts total
2. Calculates articles added since last Thursday at 8 PM EST
3. Counts articles with associated states
4. Counts approved articles (uses `sqlQueryArticlesApproved()`)
5. Identifies approved articles not yet in any report
6. Returns aggregated statistics

**Response (200 OK):**

```json
{
  "summaryStatistics": {
    "articlesCount": 15423,
    "articlesSinceLastThursday20hEst": 287,
    "articleHasStateCount": 1234,
    "articleIsApprovedCount": 456,
    "approvedButNotInReportCount": 123
  }
}
```

**Response (401 Unauthorized - Missing Token):**

```json
{
  "message": "Token is required"
}
```

**Response (403 Forbidden - Invalid Token):**

```json
{
  "message": "Invalid token"
}
```

**Example:**

```bash
curl -X GET http://localhost:8001/articles/summary-statistics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response Fields:**

| Field                           | Type   | Description                                             |
| ------------------------------- | ------ | ------------------------------------------------------- |
| articlesCount                   | number | Total number of articles in the database                |
| articlesSinceLastThursday20hEst | number | Articles added since last Thursday at 8 PM Eastern Time |
| articleHasStateCount            | number | Unique articles with at least one state association     |
| articleIsApprovedCount          | number | Unique articles with isApproved=true                    |
| approvedButNotInReportCount     | number | Approved articles not yet submitted to any report       |

**Approval Counting Logic:**

This endpoint properly counts approved articles by using `sqlQueryArticlesApproved()` which filters by `isApproved=true`:

```sql
SELECT a.id AS "articleId", ...
FROM "Articles" a
INNER JOIN "ArticleApproveds" aa ON aa."articleId" = a.id
WHERE (aa."isApproved" = true OR aa."isApproved" = 1)
ORDER BY a.id;
```

**This ensures:**

- ✅ `articleIsApprovedCount` only includes articles with `isApproved=true`
- ✅ `approvedButNotInReportCount` excludes unapproved articles
- ✅ Aligns with the new approval workflow
- ✅ Consistent with `GET /articles/approved` endpoint behavior
- ✅ Handles both boolean (`true`) and integer (`1`) representations

**Calculation Details:**

### articlesCount

- Simple count of all articles returned by `sqlQueryArticles({})`
- Represents total articles in database

### articlesSinceLastThursday20hEst

- Filters articles where `createdAt >= lastThursday20hEst`
- Uses `getLastThursdayAt20hInNyTimeZone()` helper function
- Useful for weekly reporting cycles

### articleHasStateCount

- Counts unique articleIds from `sqlQueryArticlesWithStates()`
- Only includes articles with at least one state association
- Uses Set to deduplicate article IDs

### articleIsApprovedCount

- Counts unique articleIds from `sqlQueryArticlesApproved()`
- Filters by `isApproved=true` to exclude unapproved articles
- Uses Set to deduplicate article IDs

### approvedButNotInReportCount

- Takes approved articles and filters out those in `ArticleReportContracts`
- Counts articles that are approved but not yet submitted to reports
- Properly excludes articles with `isApproved=false`

**Use Cases:**

1. **Dashboard Metrics**: Display key statistics on admin dashboard
2. **Workflow Monitoring**: Track progress of article processing pipeline
3. **Weekly Reports**: Monitor articles added since last reporting cycle
4. **Quality Assurance**: Identify approved articles awaiting report submission
5. **Capacity Planning**: Understand volume of articles being processed

**Integration Example:**

```javascript
// Fetch summary statistics for dashboard
const getSummaryStats = async () => {
  const response = await fetch(
    "http://localhost:8001/articles/summary-statistics",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const { summaryStatistics } = await response.json();

  // Display on dashboard
  logger.info(`Total Articles: ${summaryStatistics.articlesCount}`);
  logger.info(
    `This Week: ${summaryStatistics.articlesSinceLastThursday20hEst}`
  );
  logger.info(`With States: ${summaryStatistics.articleHasStateCount}`);
  logger.info(`Approved: ${summaryStatistics.articleIsApprovedCount}`);
  logger.info(
    `Pending Report: ${summaryStatistics.approvedButNotInReportCount}`
  );

  return summaryStatistics;
};
```

**Time Calculation Notes:**

- **Last Thursday at 8 PM EST**: Uses `getLastThursdayAt20hInNyTimeZone()` helper
- Aligns with weekly reporting cycle (Thursday 8 PM to Thursday 8 PM)
- Handles timezone conversion to New York time
- Uses Luxon library for date calculations

**Performance Notes:**

- Multiple database queries executed sequentially
- Uses Set for efficient deduplication
- No pagination - returns all counts
- Typical response time: < 2 seconds for databases with 10,000+ articles

**Related Files:**

- Route Implementation: `src/routes/articles.js:404-463`
- Query Functions: `src/modules/queriesSql.js`
  - `sqlQueryArticles()`
  - `sqlQueryArticlesWithStates()`
  - `sqlQueryArticlesApproved()` (filters by isApproved=true)
  - `sqlQueryArticlesReport()`
- Helper Functions: `src/modules/common.js`
  - `getLastThursdayAt20hInNyTimeZone()`

**Related Endpoints:**

- `POST /articles` - Get filtered articles list
- `GET /articles/approved` - Get approved articles (correctly filters by isApproved=true)
- `POST /articles/approve/:articleId` - Approve/unapprove articles

---

## POST /articles/update-approved-all/:articleId

Updates article fields across multiple tables (Articles, ArticleApproved, ArticleStateContract) for a given article. Allows updating publication details, content, and state associations in a single request.

**Authentication:** Required (JWT token)

### Sample Request

```bash
curl -X POST http://localhost:8001/articles/update-approved-all/12345 \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "newPublicationName": "Consumer Safety News",
    "newTitle": "Electric Scooter Recall Announced",
    "newUrl": "https://example.com/news/scooter-recall",
    "newPublishedDate": "2025-11-07",
    "newStateIdsArray": [5, 36],
    "newContent": "Electric scooter recall due to fire hazard"
  }'
```

### Request Body Fields

| Field              | Type   | Required | Description                                                                      |
| ------------------ | ------ | -------- | -------------------------------------------------------------------------------- |
| newPublicationName | string | No       | Updates Articles.publicationName and ArticleApproved.publicationNameForPdfReport |
| newTitle           | string | No       | Updates Articles.title and ArticleApproved.headlineForPdfReport                  |
| newUrl             | string | No       | Updates Articles.url and ArticleApproved.urlForPdfReport                         |
| newPublishedDate   | string | No       | Updates Articles.publishedDate and ArticleApproved.publicationDateForPdfReport   |
| newStateIdsArray   | array  | No       | Replaces all ArticleStateContract records with new state associations            |
| newContent         | string | No       | Updates Articles.description and ArticleApproved.textForPdfReport                |

### Success Response (200)

```json
{
  "result": true,
  "status": "articleId 12345 updated successfully",
  "article": {
    "id": 12345,
    "title": "Electric Scooter Recall Announced",
    "description": "Electric scooter recall due to fire hazard",
    "publicationName": "Consumer Safety News",
    "url": "https://example.com/news/scooter-recall",
    "publishedDate": "2025-11-07",
    "States": [
      { "id": 5, "name": "California", "abbreviation": "CA" },
      { "id": 36, "name": "New York", "abbreviation": "NY" }
    ],
    "ArticleApproveds": [
      {
        "id": 789,
        "headlineForPdfReport": "Electric Scooter Recall Announced",
        "textForPdfReport": "Electric scooter recall due to fire hazard"
      }
    ]
  }
}
```

### Error Response (500)

```json
{
  "result": false,
  "error": "Failed to update article",
  "message": "Error details"
}
```

### Behavior

- **Articles Table**: Only updates fields where the corresponding body parameter is not null
- **ArticleApproved Table**: Only updates if a record exists for the articleId; skips if no record exists
- **ArticleStateContract Table**: If newStateIdsArray is provided, deletes ALL existing records and creates new ones
- **Null Handling**: Null or undefined values are ignored; only non-null values trigger updates
- **Transaction Safety**: Wrapped in try-catch for error handling

---

## POST /articles/add-article

Creates a new article manually with associated states and optional approval record. Used for manually adding articles that were found outside automated feeds.

**Authentication:** Required (JWT token)

### Sample Request

```bash
curl -X POST http://localhost:8001/articles/add-article \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "publicationName": "Consumer Safety News",
    "author": "Jane Smith",
    "title": "Electric Bike Battery Recall Issued",
    "description": "Company announces recall of electric bike batteries due to fire risk",
    "content": "Detailed article content for PDF report...",
    "url": "https://example.com/news/bike-battery-recall",
    "publishedDate": "2025-11-07",
    "stateObjArray": [
      { "id": 5, "name": "California", "abbreviation": "CA" },
      { "id": 36, "name": "New York", "abbreviation": "NY" }
    ],
    "isApproved": true,
    "kmNotes": "High priority - widespread issue"
  }'
```

### Request Body Fields

| Field           | Type    | Required | Description                                                   |
| --------------- | ------- | -------- | ------------------------------------------------------------- |
| publicationName | string  | Yes      | Name of the publication source                                |
| author          | string  | No       | Article author name                                           |
| title           | string  | Yes      | Article headline/title                                        |
| description     | string  | Yes      | Article description/summary                                   |
| content         | string  | No       | Full article text content (used for PDF report if approved)   |
| url             | string  | Yes      | URL to the original article                                   |
| publishedDate   | string  | Yes      | Publication date in YYYY-MM-DD format                         |
| stateObjArray   | array   | Yes      | Array of state objects with id, name, and abbreviation fields |
| isApproved      | boolean | No       | If true, creates ArticleApproved record immediately           |
| kmNotes         | string  | No       | Knowledge manager notes (saved in ArticleApproved.kmNotes)    |

### Success Response (200)

```json
{
  "result": true,
  "newArticle": {
    "id": 12345,
    "publicationName": "Consumer Safety News",
    "author": "Jane Smith",
    "title": "Electric Bike Battery Recall Issued",
    "description": "Company announces recall of electric bike batteries due to fire risk",
    "url": "https://example.com/news/bike-battery-recall",
    "publishedDate": "2025-11-07",
    "entityWhoFoundArticleId": 42,
    "createdAt": "2025-11-07T10:30:00.000Z",
    "updatedAt": "2025-11-07T10:30:00.000Z"
  }
}
```

### Behavior

- **EntityWhoFoundArticle**: Automatically looks up the entity associated with the authenticated user
- **Article Creation**: Creates new Article record with provided fields
- **State Associations**: Creates ArticleStateContract records for each state in stateObjArray
- **Optional Approval**: If isApproved=true, creates ArticleApproved record with:
  - Fields mapped from request: title → headlineForPdfReport, publicationName → publicationNameForPdfReport, publishedDate → publicationDateForPdfReport, content → textForPdfReport, url → urlForPdfReport
  - Additional fields: userId (from JWT), kmNotes
- **Use Case**: Intended for manually found articles not captured by automated NewsAPI/RSS feeds

---

## GET /articles/article-details/:articleId

Retrieves comprehensive details for a specific article including base article data, article content, human-approved states, and AI-approved state information with metadata. Provides a complete view of the article and all associated state assignments.

**Authentication:** Required (JWT token)

**URL Parameters:**

| Parameter | Type   | Required | Description                           |
| --------- | ------ | -------- | ------------------------------------- |
| articleId | number | Yes      | ID of the article to retrieve details |

**Request Body:** None

**Description:**

This endpoint provides a comprehensive view of an article by combining data from multiple tables: Articles, ArticleContents, ArticleStateContracts (human-approved states), ArticleStateContracts02 (AI-approved states), and States. It returns all relevant information needed for detailed article analysis and review.

**Process Flow:**

1. Validates articleId parameter is a valid number
2. Executes SQL query joining multiple tables:
   - Articles (base article data)
   - ArticleContents (scraped article content)
   - ArticleStateContracts + States (human-approved state assignments)
   - ArticleStateContracts02 + States (AI-approved state assignment with metadata)
3. Formats results to handle multiple human-approved states
4. Returns 404 if article doesn't exist
5. Returns comprehensive article object with all associated data

**Response (200 OK - Complete Data):**

```json
{
  "articleId": 12345,
  "title": "Fire hazard reported in consumer electronics",
  "description": "Investigation reveals safety concerns with popular device",
  "url": "https://example.com/article/12345",
  "content": "Full scraped article content text goes here...",
  "stateHumanApprovedArray": [
    {
      "id": 5,
      "name": "California"
    },
    {
      "id": 33,
      "name": "New York"
    }
  ],
  "stateAiApproved": {
    "promptId": 5,
    "isHumanApproved": false,
    "reasoning": "Article mentions specific location in California and describes product safety incident occurring within state boundaries",
    "state": {
      "id": 5,
      "name": "California"
    }
  }
}
```

**Response (200 OK - Minimal Data):**

If article exists but has no content or state assignments:

```json
{
  "articleId": 12346,
  "title": "Product recall announced",
  "description": "Company issues recall for defective items",
  "url": "https://example.com/article/12346"
}
```

**Response (400 Bad Request - Invalid ID):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid article ID provided",
    "details": "Article ID must be a valid number",
    "status": 400
  }
}
```

**Response (404 Not Found - Article Doesn't Exist):**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Article not found",
    "details": "No article exists with ID 99999",
    "status": 404
  }
}
```

**Response (500 Internal Server Error):**

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to retrieve article details",
    "details": "Database connection error",
    "status": 500
  }
}
```

**Response (401 Unauthorized - Missing Token):**

```json
{
  "message": "Token is required"
}
```

**Response (403 Forbidden - Invalid Token):**

```json
{
  "message": "Invalid token"
}
```

**Example:**

```bash
curl -X GET http://localhost:8001/articles/article-details/12345 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response Fields:**

| Field                    | Type   | Optional | Description                                                       |
| ------------------------ | ------ | -------- | ----------------------------------------------------------------- |
| articleId                | number | No       | Unique article identifier                                         |
| title                    | string | No       | Article headline                                                  |
| description              | string | No       | Article summary or excerpt                                        |
| url                      | string | No       | Full URL to the article source                                    |
| content                  | string | Yes      | Full scraped article content from ArticleContents table           |
| stateHumanApprovedArray  | array  | Yes      | Array of human-approved state objects from ArticleStateContracts  |
| stateAiApproved          | object | Yes      | AI-approved state with metadata from ArticleStateContracts02      |

**stateHumanApprovedArray Objects:**

| Field | Type   | Description        |
| ----- | ------ | ------------------ |
| id    | number | State ID           |
| name  | string | Full state name    |

**stateAiApproved Object:**

| Field           | Type    | Description                                           |
| --------------- | ------- | ----------------------------------------------------- |
| promptId        | number  | ID of the prompt used for AI analysis                 |
| isHumanApproved | boolean | Whether a human has approved this AI state assignment |
| reasoning       | string  | AI's explanation for the state assignment             |
| state           | object  | State object with id and name fields                  |

**Optional Fields Behavior:**

- **content**: Only included if article has entry in ArticleContents table
- **stateHumanApprovedArray**: Only included if article has entries in ArticleStateContracts table
- **stateAiApproved**: Only included if article has entry in ArticleStateContracts02 table with non-null stateId

**Use Cases:**

1. **Article Review**: Get complete article information for manual review and analysis
2. **State Assignment Verification**: Compare human-approved vs AI-approved state assignments
3. **Content Analysis**: View full article content alongside metadata for quality assessment
4. **AI Performance Evaluation**: Review AI reasoning and compare with human assignments
5. **Article Details Display**: Show comprehensive article information in UI

**Integration Example:**

```javascript
// Fetch complete article details
const getArticleDetails = async (articleId) => {
  const response = await fetch(
    `http://localhost:8001/articles/article-details/${articleId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    logger.error("Failed to fetch article:", error.error.message);
    return null;
  }

  const article = await response.json();

  // Display article information
  logger.info(`Title: ${article.title}`);
  logger.info(`URL: ${article.url}`);

  if (article.content) {
    logger.info(`Content length: ${article.content.length} characters`);
  }

  if (article.stateHumanApprovedArray) {
    logger.info(
      `Human-approved states: ${article.stateHumanApprovedArray.map((s) => s.name).join(", ")}`
    );
  }

  if (article.stateAiApproved) {
    logger.info(`AI-approved state: ${article.stateAiApproved.state.name}`);
    logger.info(`AI reasoning: ${article.stateAiApproved.reasoning}`);
  }

  return article;
};
```

**Data Deduplication:**

- **Multiple Human States**: If an article has multiple ArticleStateContracts entries for the same state, only one entry per unique stateId is returned in stateHumanApprovedArray
- **Single AI State**: ArticleStateContracts02 should have only one entry per article; only the first entry is returned

**Important Notes:**

- All authenticated users can access this endpoint (no admin restriction)
- Follows ERROR_REQUIREMENTS.md standard for error responses with code, message, details, and status fields
- Returns 404 with structured error object if article doesn't exist
- Returns 400 with validation error if articleId is not a valid number
- Content field may be quite large (full article text); consider pagination or truncation for UI display
- State assignments from human review (ArticleStateContracts) and AI analysis (ArticleStateContracts02) are kept separate
- The endpoint uses a single optimized SQL query with multiple LEFT JOINs for performance

**Performance Notes:**

- Single SQL query with multiple LEFT JOINs
- Efficient for retrieving all related data in one database round trip
- Typical response time: < 100ms for single article lookup
- Content field can be large (10-50KB for full article text)

**Error Handling Standards:**

This endpoint follows the ERROR_REQUIREMENTS.md standards:

- **400 errors**: Structured error object with VALIDATION_ERROR code
- **404 errors**: Structured error object with NOT_FOUND code
- **500 errors**: Structured error object with INTERNAL_ERROR code
- **Development mode**: Includes error.message in details field
- **Production mode**: Omits sensitive error details

**Related Files:**

- Route Implementation: `src/routes/articles.js:1040-1094`
- SQL Query: `src/modules/queriesSql.js` - `sqlQueryArticleDetails()`
- Formatting Helper: `src/modules/articles.js` - `formatArticleDetails()`
- Related Tables: Articles, ArticleContents, ArticleStateContracts, ArticleStateContracts02, States

**Related Endpoints:**

- `POST /articles` - Get filtered list of articles
- `GET /articles/approved` - Get only approved articles
- `POST /analysis/state-assigner` - Get articles with AI state assignments for analysis
- `GET /articles/get-approved/:articleId` - Get approval information for article

---
