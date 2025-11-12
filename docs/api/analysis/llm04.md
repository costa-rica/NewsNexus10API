# API Reference - News Nexus 10 API LLM04

This document provides comprehensive documentation for all article management endpoints in the News Nexus 10 API service.

## LLM04 Endpoints

All article endpoints are prefixed with `/analysis/llm04` and handle article retrieval, filtering, and approval management for the CPSC consumer product safety monitoring system.

---

## GET /analysis/llm04/approved

Retrieves all articles that have been approved by AI systems (from ArticlesApproved02 table) along with their associated states.

**Authentication:** Required (JWT token)

### Sample Request

```bash
curl -X GET http://localhost:8001/analysis/llm04/approved \
  -H "Authorization: Bearer <jwt_token>"
```

### Sample Response

```json
{
  "articlesArray": [
    {
      "id": 1234,
      "title": "Product recall issued for defective batteries",
      "description": "Company announces recall...",
      "publishedDate": "2025-01-15",
      "createdAt": "2025-01-16T10:30:00.000Z",
      "publicationName": "Safety News",
      "url": "https://example.com/article",
      "author": "Jane Smith",
      "urlToImage": "https://example.com/image.jpg",
      "entityWhoFoundArticleId": 5,
      "newsApiRequestId": 42,
      "newsRssRequestId": null,
      "States": [
        {
          "id": 3,
          "name": "California",
          "abbreviation": "CA"
        }
      ],
      "ArticlesApproved02": [
        {
          "id": 567,
          "artificialIntelligenceId": 2,
          "createdAt": "2025-01-16T11:00:00.000Z",
          "isApproved": true,
          "headlineForPdfReport": "Battery Recall Alert",
          "publicationNameForPdfReport": "Safety News",
          "publicationDateForPdfReport": "2025-01-15",
          "textForPdfReport": "Summary text for report...",
          "urlForPdfReport": "https://example.com/article",
          "kmNotes": "High priority - widespread issue"
        }
      ],
      "stateAbbreviation": "CA"
    }
  ],
  "timeToRenderResponseFromApiInSeconds": 0.245
}
```

### Response Fields

- **articlesArray**: Array of approved articles with nested states and approval records
- **States**: Array of states associated with the article
- **ArticlesApproved02**: Array of AI approval records (from ArticlesApproved02 table)
- **stateAbbreviation**: Comma-separated state abbreviations if multiple states
- **timeToRenderResponseFromApiInSeconds**: Query execution time

---

## GET /analysis/llm04/human-approved/:articleId

Creates a human approval record in the ArticleApproveds table by copying data from the ArticlesApproved02 table for the specified article.

**Authentication:** Required (JWT token)

### Sample Request

```bash
curl -X GET http://localhost:8001/analysis/llm04/human-approved/1234 \
  -H "Authorization: Bearer <jwt_token>"
```

### Success Response (200)

```json
{
  "message": "Successfully human approved article"
}
```

### Error Responses

**No AI approval found (404)**
```json
{
  "error": "No row for articleId 1234 in the ArticlesApproved02 table"
}
```

**Multiple AI approvals found (400)**
```json
{
  "error": "Multiple rows in the ArticlesApproved02 table for the same articleId 1234"
}
```

**Already human approved (400)**
```json
{
  "error": "This article has already been human approved"
}
```

### Behavior

- Copies data from ArticlesApproved02 to ArticleApproveds table
- Uses JWT token to get userId for the approval record
- If ArticleApproveds record exists with `isApproved=false`, updates it
- If ArticleApproveds record exists with `isApproved=true`, returns error
- If no ArticleApproveds record exists, creates new one
- Fields copied: `isApproved`, `headlineForPdfReport`, `publicationNameForPdfReport`, `publicationDateForPdfReport`, `textForPdfReport`, `urlForPdfReport`
