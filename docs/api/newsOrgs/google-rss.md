# API Reference - News Nexus 10 API Google RSS

This document provides comprehensive documentation for all Google RSS endpoints in the News Nexus 10 API service.

## Google RSS Endpoints

All Google RSS endpoints are prefixed with `/google-rss` and handle fetching articles from Google News RSS feeds and saving them to the NewsNexus database for the CPSC consumer product safety monitoring system.

---

## POST /google-rss/make-request

Fetches articles from Google News RSS feed based on search parameters and returns parsed data without saving to the database. Allows users to preview articles before deciding which ones to save.

**Authentication:** Required (JWT token)

### Sample Request

**Basic request with AND keywords:**

```bash
curl -X POST http://localhost:8001/google-rss/make-request \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "and_keywords": "product recall, consumer safety",
    "time_range": "7d"
  }'
```

**Request with exact phrases:**

```bash
curl -X POST http://localhost:8001/google-rss/make-request \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "and_keywords": "fire hazard",
    "and_exact_phrases": "\"product recall\", \"consumer safety\"",
    "time_range": "30d"
  }'
```

**Request with OR keywords:**

```bash
curl -X POST http://localhost:8001/google-rss/make-request \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "and_keywords": "consumer product",
    "or_keywords": "recall, warning, hazard",
    "time_range": "14d"
  }'
```

**Complex query with AND and OR:**

```bash
curl -X POST http://localhost:8001/google-rss/make-request \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "and_keywords": "consumer safety",
    "and_exact_phrases": "\"United States\"",
    "or_keywords": "California, Texas, Florida",
    "time_range": "7d"
  }'
```

### Request Body Fields

| Field             | Type   | Required | Default | Description                                                                  |
| ----------------- | ------ | -------- | ------- | ---------------------------------------------------------------------------- |
| and_keywords      | string | No\*     | ""      | Comma-separated keywords for AND search (e.g., "safety, recall")             |
| and_exact_phrases | string | No\*     | ""      | Quoted exact phrases for AND search (e.g., "\"product recall\"")             |
| or_keywords       | string | No\*     | ""      | Comma-separated keywords for OR search (e.g., "fire, burn, explode")         |
| or_exact_phrases  | string | No\*     | ""      | Quoted exact phrases for OR search (e.g., "\"fire hazard\"")                 |
| time_range        | string | No       | "180d"  | Time range for articles (e.g., "1d", "7d", "30d"). Must match `\d+d` pattern |

\* **At least one** of `and_keywords`, `and_exact_phrases`, `or_keywords`, or `or_exact_phrases` must be provided

### Success Response (200)

```json
{
  "success": true,
  "url": "https://news.google.com/rss/search?q=consumer%20safety%20%22United%20States%22%20(California%20OR%20Texas%20OR%20Florida)%20when%3A7d&hl=en-US&gl=US&ceid=US%3Aen",
  "articlesArray": [
    {
      "title": "California issues recall for consumer electronics",
      "link": "https://news.google.com/rss/articles/example1",
      "description": "State officials announce safety recall for popular device",
      "source": "Consumer Safety News",
      "pubDate": "Tue, 04 Feb 2026 10:30:00 GMT",
      "content": "Full article content here..."
    },
    {
      "title": "Texas consumer protection agency warns about product hazard",
      "link": "https://news.google.com/rss/articles/example2",
      "description": "New warning issued for household appliance",
      "source": "Safety Watch",
      "pubDate": "Mon, 03 Feb 2026 14:20:00 GMT",
      "content": "Full article content here..."
    }
  ],
  "count": 2
}
```

### Error Responses

**Missing required parameters (400)**

```json
{
  "success": false,
  "error": "Invalid parameters",
  "message": "At least one of and_keywords, and_exact_phrases, or_keywords, or_exact_phrases must be provided"
}
```

**Rate limit exceeded (503)**

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Google News returned HTTP 503. Please wait before retrying.",
  "statusCode": 503
}
```

**Server error (500)**

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Failed to fetch RSS feed: [error details]"
}
```

**Authentication required (401)**

```json
{
  "message": "Token is required"
}
```

### Response Fields

- **success**: Boolean indicating success/failure
- **url**: The complete Google News RSS URL that was requested
- **articlesArray**: Array of article objects from RSS feed
  - **title**: Article headline
  - **link**: Article URL
  - **description**: Article summary/description
  - **source**: Publication name
  - **pubDate**: Publication date (RFC 2822 format)
  - **content**: Full article content (if available from RSS feed)
- **count**: Number of articles returned

### Behavior

- Multi-word terms without quotes are automatically wrapped in quotes for exact phrase matching
- OR keywords are wrapped in parentheses when combined with AND keywords
- Time range defaults to "180d" if not provided or invalid format
- Invalid time ranges (not matching `\d+d` pattern) default to "180d"
- No duplicate checking is performed (client responsibility)
- 20 second timeout per request
- User-Agent header: "NewsNexus10API/1.0"

---

## POST /google-rss/add-to-database

Saves previously fetched articles from the `/google-rss/` endpoint to the NewsNexus database. Performs deduplication based on article URL and tracks the request metadata.

**Authentication:** Required (JWT token)

### Sample Request

```bash
curl -X POST http://localhost:8001/google-rss/add-to-database \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "articlesArray": [
      {
        "title": "California issues recall for consumer electronics",
        "link": "https://news.google.com/rss/articles/example1",
        "description": "State officials announce safety recall for popular device",
        "source": "Consumer Safety News",
        "pubDate": "Tue, 04 Feb 2026 10:30:00 GMT",
        "content": "Full article content here..."
      },
      {
        "title": "Texas consumer protection agency warns about product hazard",
        "link": "https://news.google.com/rss/articles/example2",
        "description": "New warning issued for household appliance",
        "source": "Safety Watch",
        "pubDate": "Mon, 03 Feb 2026 14:20:00 GMT",
        "content": "Full article content here..."
      }
    ],
    "url": "https://news.google.com/rss/search?q=consumer%20safety%20when%3A7d&hl=en-US&gl=US&ceid=US%3Aen",
    "and_keywords": "consumer safety",
    "and_exact_phrases": "",
    "or_keywords": "",
    "or_exact_phrases": "",
    "time_range": "7d"
  }'
```

### Request Body Fields

| Field             | Type   | Required | Description                                           |
| ----------------- | ------ | -------- | ----------------------------------------------------- |
| articlesArray     | array  | Yes      | Array of article objects from `/google-rss/` response |
| url               | string | Yes      | The Google RSS URL used to fetch the articles         |
| and_keywords      | string | No       | Original AND keywords parameter                       |
| and_exact_phrases | string | No       | Original AND exact phrases parameter                  |
| or_keywords       | string | No       | Original OR keywords parameter                        |
| or_exact_phrases  | string | No       | Original OR exact phrases parameter                   |
| time_range        | string | No       | Original time range parameter                         |

**Article Object Structure:**

Each article in `articlesArray` must contain:

- `title` (string, required)
- `link` (string, required)
- At least one of: `description` or `content`

Optional fields: `source`, `pubDate`

### Success Response (200)

**All articles saved:**

```json
{
  "success": true,
  "newsApiRequestId": 1234,
  "articlesReceived": 2,
  "articlesSaved": 2,
  "articleIds": [5678, 5679],
  "message": "Successfully saved 2 of 2 articles to database"
}
```

**Partial save (duplicates skipped):**

```json
{
  "success": true,
  "newsApiRequestId": 1235,
  "articlesReceived": 5,
  "articlesSaved": 3,
  "articleIds": [5680, 5681, 5682],
  "message": "Successfully saved 3 of 5 articles to database (2 duplicates skipped)"
}
```

### Error Responses

**Invalid request - missing articlesArray (400)**

```json
{
  "success": false,
  "error": "Invalid request",
  "message": "articlesArray must be a non-empty array"
}
```

**Invalid request - missing URL (400)**

```json
{
  "success": false,
  "error": "Invalid request",
  "message": "url is required and must be a string"
}
```

**Invalid article structure (400)**

```json
{
  "success": false,
  "error": "Invalid request",
  "message": "Each article must have at least title and link fields"
}
```

**Database error (500)**

```json
{
  "success": false,
  "error": "Database error",
  "message": "Failed to save articles: [error details]"
}
```

**Authentication required (401)**

```json
{
  "message": "Token is required"
}
```

### Response Fields

- **success**: Boolean indicating success/failure
- **newsApiRequestId**: ID of created NewsApiRequest record
- **articlesReceived**: Total number of articles in request
- **articlesSaved**: Number of articles actually saved (after deduplication)
- **articleIds**: Array of Article IDs that were created
- **message**: Human-readable summary of operation

### Behavior

- Creates or reuses `NewsArticleAggregatorSource` record for "Google News RSS"
- Creates or reuses `EntityWhoFoundArticle` linked to Google News RSS source
- Creates `NewsApiRequest` record with query parameters and counts
- Deduplicates articles by URL (skips if URL already exists in Article table)
- Creates `Article` record for each new article with metadata
- Creates `ArticleContent` record for article text content
- Parses `pubDate` field to Date object for `publishedDate` column
- Sets `isFromAutomation=false` (user-initiated via API)
- Records both `articlesReceived` and `articlesSaved` counts in NewsApiRequest
- Links articles to NewsApiRequest via `newsApiRequestId` foreign key

### Database Tables Modified

1. **NewsArticleAggregatorSource**: Ensures "Google News RSS" source exists
2. **EntityWhoFoundArticle**: Ensures entity linked to source exists
3. **NewsApiRequest**: Creates new request record with query metadata
4. **Article**: Creates records for new articles (deduplicates by URL)
5. **ArticleContent**: Creates content records for articles with text
