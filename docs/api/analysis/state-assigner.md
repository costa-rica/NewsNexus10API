# API Reference - News Nexus 10 API State Assigner

This document provides comprehensive documentation for all state-assigner endpoints in the News Nexus 10 API service.

## State Assigner Endpoints

All state-assigner endpoints are prefixed with `/analysis/state-assigner` and handle retrieval and analysis of AI-assigned state data from the ArticleStateContracts02 table for the CPSC consumer product safety monitoring system.

---

## POST /analysis/state-assigner/

Retrieves articles with their AI-assigned state data from the ArticleStateContracts02 table, including state assignment metadata such as prompt ID, approval status, and AI reasoning.

**Authentication:** Required (JWT token)

### Sample Request

**Without includeNullState (default behavior - returns articles with assigned states):**
```bash
curl -X POST http://localhost:8001/analysis/state-assigner/ \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**With includeNullState=false (explicitly exclude null states):**
```bash
curl -X POST http://localhost:8001/analysis/state-assigner/ \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "includeNullState": false
  }'
```

**With includeNullState=true (return only articles without assigned states):**
```bash
curl -X POST http://localhost:8001/analysis/state-assigner/ \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "includeNullState": true
  }'
```

### Request Body Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| includeNullState | boolean | No | false | If true, returns articles with null stateId; if false, returns only articles with non-null stateId |

### Success Response (200)

```json
{
  "result": true,
  "message": "Successfully retrieved articles with state assignments",
  "count": 2,
  "articles": [
    {
      "id": 1234,
      "title": "Fire hazard reported in consumer electronics",
      "description": "Investigation reveals safety concerns with popular device",
      "url": "https://example.com/article/1234",
      "createdAt": "2026-01-10T14:30:00.000Z",
      "stateAssignment": {
        "promptId": 5,
        "isHumanApproved": false,
        "isDeterminedToBeError": false,
        "occuredInTheUS": true,
        "reasoning": "Article mentions specific location in California and describes product safety incident",
        "stateId": 5,
        "stateName": "California"
      }
    },
    {
      "id": 1235,
      "title": "Product recall announced for children's toys",
      "description": "Choking hazard leads to nationwide recall",
      "url": "https://example.com/article/1235",
      "createdAt": "2026-01-09T10:15:00.000Z",
      "stateAssignment": {
        "promptId": 5,
        "isHumanApproved": true,
        "isDeterminedToBeError": false,
        "occuredInTheUS": true,
        "reasoning": "Article discusses recall in New York and New Jersey metropolitan area",
        "stateId": 33,
        "stateName": "New York"
      }
    }
  ]
}
```

### Response Fields

- **result**: Boolean indicating success/failure
- **message**: Description of the operation result
- **count**: Number of articles returned
- **articles**: Array of article objects with nested state assignment data
  - **id**: Article ID
  - **title**: Article title
  - **description**: Article description
  - **url**: Article URL
  - **createdAt**: Timestamp when article was added to database
  - **stateAssignment**: Object containing AI state assignment metadata
    - **promptId**: ID of the prompt used for AI analysis
    - **isHumanApproved**: Whether a human has approved this state assignment
    - **isDeterminedToBeError**: Whether this assignment was marked as an error
    - **occuredInTheUS**: Whether the AI determined the incident occurred in the US
    - **reasoning**: AI's explanation for the state assignment
    - **stateId**: ID of the assigned state (null if no state assigned)
    - **stateName**: Name of the assigned state (null if no state assigned)

### Error Responses

**Invalid parameter type (400)**
```json
{
  "result": false,
  "message": "includeNullState must be a boolean value if provided"
}
```

**Internal server error (500)**
```json
{
  "result": false,
  "message": "Internal server error",
  "error": "Error message details"
}
```

### Behavior

- Returns only articles that have entries in ArticleStateContracts02 table
- Returns only the first entry per article (should be one-to-one relationship)
- Sorted by newest first (createdAt DESC)
- When `includeNullState=false` or not provided: returns articles with assigned states (stateId IS NOT NULL)
- When `includeNullState=true`: returns articles without assigned states (stateId IS NULL)
- Joins Article, ArticleStateContracts02, and State tables
- Accessible by all authenticated users
