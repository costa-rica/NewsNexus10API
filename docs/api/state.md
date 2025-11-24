# API Reference - News Nexus 10 API State

This document provides comprehensive documentation for all state management endpoints in the News Nexus 10 API service.

## State Endpoints

All state endpoints are prefixed with `/states` and handle state retrieval and article-state association management for the CPSC consumer product safety monitoring system.

---

## GET /states

Retrieves all available states from the database.

**Authentication:** Not required

### Sample Request

```bash
curl -X GET http://localhost:8001/states
```

### Sample Response

```json
{
  "statesArray": [
    {
      "id": 1,
      "name": "Alabama",
      "abbreviation": "AL"
    },
    {
      "id": 2,
      "name": "Alaska",
      "abbreviation": "AK"
    },
    {
      "id": 3,
      "name": "Arizona",
      "abbreviation": "AZ"
    }
  ]
}
```

### Response Fields

- **statesArray**: Array of all state objects with id, name, and abbreviation

---

## POST /states/:articleId

Associates one or more states with a specific article by creating ArticleStateContract records. Replaces any existing state associations for the article.

**Authentication:** Required (JWT token)

### URL Parameters

- **articleId**: The ID of the article to associate states with

### Request Body Fields

| Field        | Type          | Required | Description                                      |
| ------------ | ------------- | -------- | ------------------------------------------------ |
| stateIdArray | Array<number> | Yes      | Array of state IDs to associate with the article |

### Sample Request

```bash
curl -X POST http://localhost:8001/states/1234 \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "stateIdArray": [3, 5, 12]
  }'
```

### Success Response (200)

```json
{
  "result": true,
  "articleStateContracts": [
    {
      "articleId": 1234,
      "stateId": 3
    },
    {
      "articleId": 1234,
      "stateId": 5
    },
    {
      "articleId": 1234,
      "stateId": 12
    }
  ]
}
```

### Error Responses

**Missing required field (400)**

```json
{
  "error": "Missing stateIdArray"
}
```

### Behavior

- Deletes all existing ArticleStateContract records for the specified articleId
- Creates new ArticleStateContract records for each stateId in the array
- Uses bulk insert for efficiency
- Returns the created contract records
