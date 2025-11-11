# API Reference - News Nexus 10 API LLM04

This document provides comprehensive documentation for all article management endpoints in the News Nexus 10 API service.

## LLM04 Endpoints

All article endpoints are prefixed with `/analysis/llm04` and handle article retrieval, filtering, and approval management for the CPSC consumer product safety monitoring system.

---

## GET /analysis/llm04/approved

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
const response = await fetch("http://localhost:8001/analysis/llm04/", {
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
