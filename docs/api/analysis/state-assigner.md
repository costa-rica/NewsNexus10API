# API Reference - News Nexus 10 API State Assigner

This document provides comprehensive documentation for all state-assigner endpoints in the News Nexus 10 API service.

## State Assigner Endpoints

All state-assigner endpoints are prefixed with `/analysis/state-assigner` and handle retrieval and analysis of AI-assigned state data from the ArticleStateContracts02 table for the CPSC consumer product safety monitoring system.

---

## POST /analysis/state-assigner/

Retrieves articles with their AI-assigned state data from the ArticleStateContracts02 table, including state assignment metadata such as prompt ID, approval status, and AI reasoning. Also includes semantic rating scores from NewsNexusSemanticScorer02 and location classifier scores from NewsNexusClassifierLocationScorer01 for each article.

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
      "semanticRatingMax": 0.89,
      "semanticRatingMaxLabel": "fire hazard",
      "locationClassifierScore": 0.92,
      "locationClassifierScoreLabel": "California",
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
      "semanticRatingMax": 0.92,
      "semanticRatingMaxLabel": "recall",
      "locationClassifierScore": 0.88,
      "locationClassifierScoreLabel": "New York",
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
  - **semanticRatingMax**: Highest semantic similarity score (0-1 range) from NewsNexusSemanticScorer02 (null if not available)
  - **semanticRatingMaxLabel**: Keyword with highest semantic similarity score (null if not available)
  - **locationClassifierScore**: Location classifier confidence score (0-1 range) from NewsNexusClassifierLocationScorer01 (null if not available)
  - **locationClassifierScoreLabel**: State name identified by location classifier (null if not available)
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
- Fetches semantic rating scores from NewsNexusSemanticScorer02 AI entity (hardcoded)
- Fetches location classifier scores from NewsNexusClassifierLocationScorer01 AI entity (hardcoded)
- If either AI entity is not found or fails, articles are returned without those scores (graceful degradation)
- Accessible by all authenticated users

---

## POST /analysis/state-assigner/human-verify/:articleId

Approve or reject an AI-assigned state for an article. Updates ArticleStateContracts02 table with human verification status and manages the ArticleStateContracts table accordingly.

**Authentication:** Required (JWT token)

### URL Parameters

| Parameter | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| articleId | number | Yes      | ID of the article to verify     |

### Request Body Fields

| Field   | Type   | Required | Description                                                    |
|---------|--------|----------|----------------------------------------------------------------|
| action  | string | Yes      | Action to perform: "approve" or "reject"                       |
| stateId | number | Yes      | ID of the state to approve/reject from AI assignment           |

### Sample Request

**Approve AI-assigned state:**
```bash
curl -X POST http://localhost:8001/analysis/state-assigner/human-verify/1234 \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "stateId": 5
  }'
```

**Reject AI-assigned state:**
```bash
curl -X POST http://localhost:8001/analysis/state-assigner/human-verify/1234 \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reject",
    "stateId": 5
  }'
```

### Success Response (200)

**Approve action:**
```json
{
  "status": "Article state approved successfully",
  "stateHumanApprovedArray": [
    {
      "id": 5,
      "name": "California"
    }
  ],
  "stateAiApproved": {
    "promptId": 5,
    "isHumanApproved": true,
    "reasoning": "Article mentions specific location in California and describes product safety incident",
    "state": {
      "id": 5,
      "name": "California"
    }
  }
}
```

**Reject action:**
```json
{
  "status": "Article state rejected successfully",
  "stateHumanApprovedArray": [],
  "stateAiApproved": {
    "promptId": 5,
    "isHumanApproved": false,
    "reasoning": "Article mentions specific location in California and describes product safety incident",
    "state": {
      "id": 5,
      "name": "California"
    }
  }
}
```

### Response Fields

| Field                    | Type   | Description                                                               |
|--------------------------|--------|---------------------------------------------------------------------------|
| status                   | string | Success message indicating whether state was approved or rejected         |
| stateHumanApprovedArray  | array  | Array of human-approved states from ArticleStateContracts (same as GET /articles/article-details/:articleId) |
| stateAiApproved          | object | AI-approved state data from ArticleStateContracts02 (same as GET /articles/article-details/:articleId) |

### Error Responses

**Invalid article ID (400)**
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

**Missing or invalid action (400)**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "action must be either \"approve\" or \"reject\"",
    "status": 400
  }
}
```

**Missing or invalid stateId (400)**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "stateId must be a valid number",
    "status": 400
  }
}
```

**AI state assignment not found (404)**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "AI state assignment not found",
    "details": "No AI state assignment exists for article 1234 with state 5",
    "status": 404
  }
}
```

**State already approved (409)**
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "State already approved",
    "details": "Article 1234 already has human-approved state 5",
    "status": 409
  }
}
```

**Internal server error (500)**
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to process human verification",
    "details": "Database connection error",
    "status": 500
  }
}
```

### Behavior

**Approve Action:**
1. Updates ArticleStateContracts02: Sets `isHumanApproved = true` for the row matching both `articleId` AND `stateId`
2. Checks if row already exists in ArticleStateContracts with same `articleId` and `stateId`
   - If exists: Returns 409 CONFLICT error
   - If not exists: Creates new row in ArticleStateContracts with `articleId` and `stateId`
3. Re-queries database using `sqlQueryArticleDetails()` to get updated data
4. Returns updated `stateHumanApprovedArray` and `stateAiApproved`

**Reject Action:**
1. Updates ArticleStateContracts02: Sets `isHumanApproved = false` for the row matching both `articleId` AND `stateId`
2. Deletes row from ArticleStateContracts where `articleId` AND `stateId` match
   - If row doesn't exist, deletion is skipped (no error)
3. Re-queries database using `sqlQueryArticleDetails()` to get updated data
4. Returns updated `stateHumanApprovedArray` and `stateAiApproved`

### Important Notes

- **Requires AI state assignment**: Article must have an existing row in ArticleStateContracts02 with matching `articleId` and `stateId`
- **Updates specific row**: Only updates the ArticleStateContracts02 row matching BOTH `articleId` AND `stateId` (not all rows for the article)
- **Duplicate prevention**: Approving a state that's already in ArticleStateContracts returns 409 CONFLICT error
- **Multiple states**: If an article has multiple human-approved states, `stateHumanApprovedArray` will contain all of them
- **Response data**: Returns fresh data from database after updates to ensure consistency
- **Follows ERROR_REQUIREMENTS.md**: All errors use structured format with code, message, details, and status

### Use Cases

1. **Human Review Workflow**: After AI assigns a state, human reviewer approves or rejects the assignment
2. **Quality Control**: Verify AI accuracy by comparing AI reasoning with human judgment
3. **State Assignment Correction**: Reject incorrect AI state assignments
4. **Approval Tracking**: Track which AI assignments have been human-verified via `isHumanApproved` field
5. **Workflow Management**: Filter articles by approval status to prioritize human review

### Integration Example

```javascript
// Approve AI state assignment
const approveState = async (articleId, stateId) => {
  const response = await fetch(
    `http://localhost:8001/analysis/state-assigner/human-verify/${articleId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "approve",
        stateId: stateId,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error("Approval failed:", error.error.message);
    return null;
  }

  const result = await response.json();
  console.log(result.status);
  console.log("Human-approved states:", result.stateHumanApprovedArray);

  return result;
};

// Reject AI state assignment
const rejectState = async (articleId, stateId) => {
  const response = await fetch(
    `http://localhost:8001/analysis/state-assigner/human-verify/${articleId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "reject",
        stateId: stateId,
      }),
    }
  );

  const result = await response.json();
  console.log(result.status);

  return result;
};
```

### Related Files

- Route Implementation: `src/routes/analysis/state-assigner.js`
- Validation Helper: `src/modules/analysis/state-assigner.js` - `validateHumanVerifyRequest()`
- SQL Query: `src/modules/queriesSql.js` - `sqlQueryArticleDetails()`
- Formatting Helper: `src/modules/articles.js` - `formatArticleDetails()`
- Related Tables: ArticleStateContracts02, ArticleStateContracts, Articles, States

### Related Endpoints

- `POST /analysis/state-assigner/` - Get articles with AI state assignments for review
- `GET /articles/article-details/:articleId` - Get complete article details including state assignments
