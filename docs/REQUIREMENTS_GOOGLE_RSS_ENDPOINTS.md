# REQUIREMENTS_GOOGLE_RSS_ENDPOINTS.md

This document provides specifications for two Express.js API endpoints that replicate the Google RSS workflow from the NewsNexusRequesterGoogleRss04 microservice.

## Overview

Two endpoints enable external clients to fetch Google News RSS articles and save them to the NewsNexus database using the same logic as the automated microservice:

1. **POST /google-rss/** - Fetches and parses Google RSS feed without saving
2. **POST /google-rss/add-to-database** - Saves previously fetched articles to database

Both endpoints use the `newsnexus10db` package for database access and follow the same patterns established in this microservice.

## Common Requirements

### Authentication

Both endpoints should use the same authentication/authorization mechanism implemented in other API endpoints. Consult existing API patterns for consistency.

### Database Integration

**CRITICAL INITIALIZATION ORDER**: The Express.js application MUST initialize database models before importing modules that use them:

```typescript
import "dotenv/config";

// MUST initialize models BEFORE importing modules that use them
const { initModels } = require("newsnexus10db");
initModels();

// NOW safe to import modules that use database models
```

**Database Configuration**: Use the same environment variables as the microservice:
- `PATH_DATABASE`: Database directory path
- `NAME_DB`: Database filename (e.g., "newsnexus10.db")

### Error Handling

All endpoints should:
- Use try-catch blocks for error handling
- Return appropriate HTTP status codes (200, 400, 404, 500, 503)
- Include error messages in response body
- Log errors for debugging

### Rate Limiting Considerations

While these endpoints don't enforce the microservice's `MILISECONDS_IN_BETWEEN_REQUESTS` delay, engineers should be aware that Google may rate limit excessive requests. Consider implementing:
- Per-IP rate limiting on the API endpoints
- Returning HTTP 429 if rate limits are exceeded
- Documenting recommended request frequency for clients

## Endpoint 1: POST /google-rss/

Fetches articles from Google News RSS and returns parsed data without saving to database.

### Request

**Method**: POST

**Path**: `/google-rss/`

**Content-Type**: `application/json`

**Body Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `and_keywords` | string | No | Comma-separated keywords for AND search (e.g., "technology, innovation") |
| `and_exact_phrases` | string | No | Quoted exact phrases for AND search (e.g., "artificial intelligence", "machine learning") |
| `or_keywords` | string | No | Comma-separated keywords for OR search (e.g., "startup, entrepreneur") |
| `or_exact_phrases` | string | No | Quoted exact phrases for OR search (e.g., "venture capital", "seed funding") |
| `time_range` | string | No | Time range for articles (e.g., "1d", "7d", "30d"). Defaults to "180d" if not provided or invalid. |

**Request Body Example**:
```json
{
  "and_keywords": "artificial intelligence, healthcare",
  "and_exact_phrases": "\"machine learning\"",
  "or_keywords": "",
  "or_exact_phrases": "",
  "time_range": "7d"
}
```

### Implementation Requirements

#### Query Building Logic

Reuse the query building logic from `src/modules/queryBuilder.ts`:

1. **Normalize Terms**: Add quotes around multi-word phrases
2. **Build AND String**: Combine `and_keywords` and `and_exact_phrases` with space separator
3. **Build OR String**: Combine `or_keywords` and `or_exact_phrases` with " OR " separator
4. **Combine**: If both AND and OR strings exist, wrap OR string in parentheses
5. **Add Time Range**: Append `when:[time_range]` to query string
6. **URL Encode**: Encode the final query string

**Google RSS URL Format**:
```
https://news.google.com/rss/search?q=[encoded_query]&hl=[hl]&gl=[gl]&ceid=[ceid]
```

**Google Parameters** (from environment variables):
- `GOOGLE_RSS_HL`: Language (e.g., "en-US")
- `GOOGLE_RSS_GL`: Geographic location (e.g., "US")
- `GOOGLE_RSS_CEID`: Country and language ID (e.g., "US:en")

#### RSS Fetching

Reuse the RSS fetching logic from `src/modules/rssFetcher.ts`:

1. **Timeout**: 20 seconds maximum per request
2. **XML Parsing**: Use `xml2js` to parse RSS response
3. **HTTP 503 Handling**: Return special error for rate limit exceeded (suggest client retry with delay)

#### Article Parsing

Extract the following fields from each RSS item (matching `rssFetcher.ts:29-36`):

| Field | RSS Path | Notes |
|-------|----------|-------|
| `title` | `item.title[0]` | Article headline |
| `link` | `item.link[0]` | Article URL |
| `description` | `item.description[0]` | Article summary |
| `source` | `item.source[0]._` | Source publication name |
| `pubDate` | `item.pubDate[0]` | Publication date |
| `content` | `item['content:encoded'][0]` | Full article content (if available) |

### Response

**Success Response** (HTTP 200):

```json
{
  "success": true,
  "url": "https://news.google.com/rss/search?q=artificial%20intelligence%20healthcare%20%22machine%20learning%22%20when%3A7d&hl=en-US&gl=US&ceid=US:en",
  "articlesArray": [
    {
      "title": "AI Revolutionizes Healthcare Diagnostics",
      "link": "https://example.com/article1",
      "description": "New AI system improves diagnostic accuracy...",
      "source": "Tech News Daily",
      "pubDate": "Fri, 04 Feb 2026 10:30:00 GMT",
      "content": "Full article content here..."
    },
    {
      "title": "Machine Learning in Medical Imaging",
      "link": "https://example.com/article2",
      "description": "Researchers develop ML model for early detection...",
      "source": "Medical Journal",
      "pubDate": "Thu, 03 Feb 2026 15:45:00 GMT",
      "content": "Full article content here..."
    }
  ],
  "count": 2
}
```

**Error Response - HTTP 503** (Rate Limited):
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Google News returned HTTP 503. Please wait before retrying.",
  "statusCode": 503
}
```

**Error Response - HTTP 400** (Invalid Parameters):
```json
{
  "success": false,
  "error": "Invalid parameters",
  "message": "At least one of and_keywords, and_exact_phrases, or_keywords, or_exact_phrases must be provided"
}
```

**Error Response - HTTP 500** (Server Error):
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Failed to fetch RSS feed: [error details]"
}
```

### Validation Rules

1. **At least one query parameter required**: One of `and_keywords`, `and_exact_phrases`, `or_keywords`, or `or_exact_phrases` must be non-empty
2. **Time range format**: Must match `\d+d` pattern (e.g., "1d", "7d") or be empty (defaults to "180d")
3. **No duplicate checking**: Unlike the microservice, this endpoint does NOT check if the URL was already requested today (client responsibility)

---

## Endpoint 2: POST /google-rss/add-to-database

Saves previously fetched articles to the NewsNexus database using the same storage logic as the microservice.

### Request

**Method**: POST

**Path**: `/google-rss/add-to-database`

**Content-Type**: `application/json`

**Body Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `articlesArray` | array | Yes | Array of article objects from POST /google-rss/ response |
| `url` | string | Yes | The Google RSS URL that was used to fetch the articles |
| `and_keywords` | string | No | Original AND keywords query parameter |
| `and_exact_phrases` | string | No | Original AND exact phrases query parameter |
| `or_keywords` | string | No | Original OR keywords query parameter |
| `or_exact_phrases` | string | No | Original OR exact phrases query parameter |
| `time_range` | string | No | Original time range parameter |

**Request Body Example**:
```json
{
  "articlesArray": [
    {
      "title": "AI Revolutionizes Healthcare Diagnostics",
      "link": "https://example.com/article1",
      "description": "New AI system improves diagnostic accuracy...",
      "source": "Tech News Daily",
      "pubDate": "Fri, 04 Feb 2026 10:30:00 GMT",
      "content": "Full article content here..."
    },
    {
      "title": "Machine Learning in Medical Imaging",
      "link": "https://example.com/article2",
      "description": "Researchers develop ML model for early detection...",
      "source": "Medical Journal",
      "pubDate": "Thu, 03 Feb 2026 15:45:00 GMT",
      "content": "Full article content here..."
    }
  ],
  "url": "https://news.google.com/rss/search?q=artificial%20intelligence%20healthcare%20%22machine%20learning%22%20when%3A7d&hl=en-US&gl=US&ceid=US:en",
  "and_keywords": "artificial intelligence, healthcare",
  "and_exact_phrases": "\"machine learning\"",
  "or_keywords": "",
  "or_exact_phrases": "",
  "time_range": "7d"
}
```

### Implementation Requirements

#### Database Setup

Reuse the storage logic from `src/modules/storage.ts` with the following modifications:

1. **Source Organization**: Use hardcoded value `"Google News RSS"` instead of `NAME_OF_ORG_REQUESTING_FROM` environment variable
2. **Entity Setup**: Call equivalent of `ensureAggregatorSourceAndEntity()` to ensure:
   - `NewsArticleAggregatorSource` exists for "Google News RSS"
   - `EntityWhoFoundArticle` exists and is linked to the source

#### Query String Building

Build `andString` and `orString` for the `NewsApiRequest` record:

1. **andString**: Combine `and_keywords` and `and_exact_phrases` (comma-separated list)
2. **orString**: Combine `or_keywords` and `or_exact_phrases` (comma-separated list)

Example:
```typescript
const andString = [and_keywords, and_exact_phrases]
  .filter(Boolean)
  .join(", ");

const orString = [or_keywords, or_exact_phrases]
  .filter(Boolean)
  .join(", ");
```

#### NewsApiRequest Record Creation

Create a `NewsApiRequest` record with the following fields (matching `storage.ts:30-48`):

| Field | Value |
|-------|-------|
| `newsArticleAggregatorSourceId` | ID from "Google News RSS" source |
| `url` | The Google RSS URL from request body |
| `andString` | Combined AND keywords and phrases |
| `orString` | Combined OR keywords and phrases |
| `requestDate` | Current date (YYYY-MM-DD format in UTC) |
| `numArticlesReceived` | Length of `articlesArray` |
| `numArticlesSaved` | Count of articles actually saved (after deduplication) |
| `requestSuccessful` | `true` (since articles were fetched successfully) |

#### Article Storage

For each article in `articlesArray` (matching `storage.ts:52-106`):

1. **Deduplication**: Check if article with same `link` URL already exists in `Article` table
2. **Skip if exists**: If article exists, skip to next article (increment received count but not saved count)
3. **Create Article record**:
   - `url`: Article link
   - `title`: Article title
   - `datePublished`: Parse `pubDate` to Date object
   - `sourceName`: Article source
   - `entityWhoFoundArticleId`: ID from "Google News RSS" entity
   - Set timestamps: `createdAt`, `updatedAt`
4. **Create ArticleContent record**:
   - `articleId`: ID from newly created Article
   - `content`: Article content or description
   - Set timestamps: `createdAt`, `updatedAt`
5. **Link to Request**: Associate article with `NewsApiRequest` record

### Response

**Success Response** (HTTP 200):

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

**Partial Success Response** (HTTP 200):
```json
{
  "success": true,
  "newsApiRequestId": 1234,
  "articlesReceived": 2,
  "articlesSaved": 1,
  "articleIds": [5678],
  "message": "Successfully saved 1 of 2 articles to database (1 duplicate skipped)"
}
```

**Error Response - HTTP 400** (Invalid Request):
```json
{
  "success": false,
  "error": "Invalid request",
  "message": "articlesArray and url are required"
}
```

**Error Response - HTTP 500** (Database Error):
```json
{
  "success": false,
  "error": "Database error",
  "message": "Failed to save articles: [error details]"
}
```

### Validation Rules

1. **Required fields**: `articlesArray` (non-empty array) and `url` (non-empty string) must be provided
2. **Article structure**: Each article in `articlesArray` must have `title`, `link`, and at least one of `description` or `content`
3. **URL validation**: The `url` should be a valid Google News RSS URL (basic format check)

---

## Database Tables Reference

### Tables Used

1. **NewsArticleAggregatorSource**: Identifies RSS source organization
   - Find or create record where `name = "Google News RSS"`

2. **EntityWhoFoundArticle**: Links to aggregator source
   - Find or create entity linked to "Google News RSS" source

3. **NewsApiRequest**: Tracks each RSS request
   - Create one record per `/add-to-database` call
   - Stores query parameters, URL, counts, date

4. **Article**: Stores article metadata
   - Unique by `url` (deduplication key)
   - One record per unique article

5. **ArticleContent**: Stores article text content
   - One-to-one relationship with Article

### Database Schema Details

For complete database schema information, see:
- `docs/DATABASE_OVERVIEW.md`
- `docs/DOCUMENTATION_ARTICLE_STORAGE.md`

---

## Code Reusability

Engineers should extract and reuse the following modules from the microservice:

### Direct Reuse (Minimal Changes)

1. **src/modules/queryBuilder.ts**: Query construction logic
   - Export: `buildGoogleRssQuery()`, `buildGoogleRssUrl()`
   - No changes needed

2. **src/modules/rssFetcher.ts**: RSS fetching and parsing
   - Export: `fetchRssFeed()`
   - No changes needed

### Adaptation Required

3. **src/modules/storage.ts**: Database operations
   - Adapt: Replace `NAME_OF_ORG_REQUESTING_FROM` env var with hardcoded "Google News RSS"
   - Export: `ensureAggregatorSourceAndEntity()`, `storeRequestAndArticles()`

### Not Needed for API

4. **src/modules/guardrail.ts**: Time window enforcement
   - NOT needed for API endpoints (no time restrictions)

5. **src/modules/spreadsheet.ts**: Excel file reading
   - NOT needed for API endpoints (JSON input instead)

6. **src/modules/semanticScorer.ts**: Child process launcher
   - NOT needed for API endpoints (client can call semantic scorer separately if needed)

---

## Testing Recommendations

### Unit Tests

1. **Query Building**: Test query construction with various parameter combinations
2. **RSS Parsing**: Test XML parsing with sample RSS responses
3. **Database Storage**: Test article deduplication and record creation
4. **Validation**: Test input validation for both endpoints

### Integration Tests

1. **End-to-End Flow**: Fetch from /google-rss/ and save via /add-to-database
2. **Deduplication**: Verify duplicate articles are skipped
3. **Error Handling**: Test HTTP 503, invalid parameters, database errors
4. **Authentication**: Verify auth requirements are enforced

### Manual Testing

Use sample requests from the microservice's query spreadsheet to verify parity with the automated workflow.

---

## Environment Variables Required

```bash
# Database Configuration
PATH_DATABASE=/path/to/database
NAME_DB=newsnexus10.db

# Google RSS Configuration
GOOGLE_RSS_HL=en-US
GOOGLE_RSS_GL=US
GOOGLE_RSS_CEID=US:en

# Logging (if using Winston)
NAME_APP=NewsNexusAPI
PATH_TO_LOGS=/path/to/logs
LOG_MAX_SIZE=5
LOG_MAX_FILES=5
```

**NOT Required** (microservice-specific):
- `GUARDRAIL_TARGET_TIME`
- `GUARDRAIL_TARGET_WINDOW_IN_MINS`
- `PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_AUTOMATED`
- `NAME_OF_ORG_REQUESTING_FROM` (replaced with hardcoded "Google News RSS")
- `MILISECONDS_IN_BETWEEN_REQUESTS` (API handles single requests, no delay needed)
- `PATH_AND_FILENAME_TO_SEMANTIC_SCORER` (semantic scoring separate from API)
- `NAME_CHILD_PROCESS_SEMANTIC_SCORER`
- `PATH_TO_SEMANTIC_SCORER_DIR`
- `PATH_TO_SEMANTIC_SCORER_KEYWORDS_EXCEL_FILE`

---

## Implementation Checklist

- [ ] Set up Express.js application with database initialization
- [ ] Implement POST /google-rss/ endpoint
  - [ ] Query building logic
  - [ ] RSS fetching with 20s timeout
  - [ ] XML parsing
  - [ ] Response formatting
- [ ] Implement POST /google-rss/add-to-database endpoint
  - [ ] Request validation
  - [ ] Database entity setup (source/entity)
  - [ ] NewsApiRequest creation
  - [ ] Article deduplication and storage
  - [ ] ArticleContent creation
  - [ ] Response with counts and IDs
- [ ] Add input validation for both endpoints
- [ ] Add error handling (HTTP 400, 503, 500)
- [ ] Implement authentication/authorization
- [ ] Write unit and integration tests
- [ ] Document API endpoints (OpenAPI/Swagger)
- [ ] Test with production database

---

## Related Documentation

- `docs/DATABASE_OVERVIEW.md` - Complete database schema
- `docs/DOCUMENTATION_ARTICLE_STORAGE.md` - Article storage specifications
- `CLAUDE.md` - This microservice's architecture and workflow
- `../NewsNexus10Db/README.md` - Database package documentation
