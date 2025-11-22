# API Reference - Articles Approveds

This document provides comprehensive documentation for article approval management  
 endpoints in the News Nexus 10 API service.

## Articles Approveds Endpoints

All endpoints are prefixed with `/articles-approveds` and handle retrieval of approved
articles for the CPSC consumer product safety monitoring system.

---

## GET /articles-approveds/for-component

Retrieves all articles approved by the authenticated user with curated fields  
 optimized for component display.

**Authentication:** Required (JWT token)

### Sample Request

```bash
curl -X GET http://localhost:8001/articles-approveds/for-component \
   -H "Authorization: Bearer <jwt_token>"
```

### Success Response (200)

```json
{
   "articlesArray": [
     {
       "articleId": 1234,
       "title": "Battery Recall Alert",
       "description": "Company announces recall of lithium batteries due to fire
       hazard...",
       "url": "https://example.com/article/battery-recall",
       "publication": "Safety News Daily",
       "publicationDate": "2025-01-15",
       "createdAt": "2025-01-16T10:30:00.000Z",
       "updatedAt": "2025-01-18T14:22:00.000Z",
       "states": "CA, TX, NY"
     },
     {
       "articleId": 1235,
       "title": "Toy Safety Warning Issued",
       "description": "Federal regulators warn parents about choking hazard...",
       "url": "https://example.com/article/toy-warning",
       "publication": "Consumer Safety Monitor",
       "publicationDate": "2025-01-14",
       "createdAt": "2025-01-15T09:15:00.000Z",
       "updatedAt": "2025-01-15T09:15:00.000Z",
       "states": "FL"
     }
   ],
   "count": 2
}
```

```json
{
  "error": "Failed to fetch approved articles for component.",
  "message": "Database connection error"
}
```

### Response Fields

- **articleId**: ID from Articles table
- **title**: Headline from ArticleApproveds.headlineForPdfReport
- **description**: Content from ArticleApproveds.textForPdfReport
- **url**: Link from ArticleApproveds.urlForPdfReport
- **publication**: Publication name from ArticleApproveds.publicationNameForPdfReport
- **publicationDate**: Date from ArticleApproveds.publicationDateForPdfReport
- **createdAt**: Timestamp when approval was created in ArticleApproveds table
- **updatedAt**: Timestamp when approval was last updated in ArticleApproveds table
- **states**: Comma-separated state abbreviations (e.g., "CA, TX")
- **count**: Total number of approved articles returned  


### Behavior

- Filters articles by authenticated user's ID from JWT token
- Only returns articles where `isApproved = true` or `isApproved = 1`
- Results sorted by `ArticleApproveds.updatedAt` descending (most recently updated first)
- State abbreviations concatenated with comma-space separator
- Articles without states will have empty string for states field
