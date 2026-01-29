# Test Requirements: POST /articles/with-ratings

## Endpoint
`POST /articles/with-ratings`

## Response Structure
The endpoint should return a JSON object with an `articlesArray` property containing an array of article objects.

## Required Array Element Properties

Each element in `response.articlesArray` must contain the following properties with the specified types:

### Core Properties (Required)
| Property | Type | Notes |
|----------|------|-------|
| `id` | `number` | Unique article identifier |
| `title` | `string` | Article headline |
| `publicationName` | `string` | Name of publication source |
| `publishedDate` | `string` | Date article was published |
| `description` | `string` | Article description/summary |
| `url` | `string` | Full URL to article |

### Optional Properties
| Property | Type | Notes |
|----------|------|-------|
| `content` | `string \| undefined` | Full article content |
| `isApproved` | `boolean \| undefined` | Article approval status |
| `isBeingReviewed` | `boolean \| undefined` | Article review tracking status |
| `isRelevant` | `boolean \| undefined` | Article relevance flag |
| `statesStringCommaSeparated` | `string \| undefined` | Comma-separated state names |
| `requestQueryString` | `string \| undefined` | Query string that found this article |
| `nameOfOrg` | `string \| undefined` | Organization that added the article |
| `semanticRatingMax` | `number \| string \| undefined` | Semantic relevance score (0-1) or "N/A" |
| `locationClassifierScore` | `number \| string \| undefined` | Location classifier score (0-1) or "N/A" |
| `States` | `Array<{id: number, name: string}> \| undefined` | Array of state objects associated with article |

## Test Coverage Requirements

1. **Type Validation**: Verify all properties have the correct data types
2. **Required Properties**: Ensure all core properties are present in every array element
3. **Optional Properties**: Confirm optional properties can be `undefined` without errors
4. **Array Structure**: Validate `articlesArray` is an array and can be empty
5. **Rating Values**: Ensure `semanticRatingMax` and `locationClassifierScore` are either numeric (0-1 range) or the string "N/A"
6. **States Array**: When present, verify each state object has `id` (number) and `name` (string)

## Frontend Usage Context
- Properties are used to populate the TableReviewArticles component
- `id`, `title`, `description`, `publishedDate`, `url`, and `statesStringCommaSeparated` are displayed in table columns
- `isBeingReviewed`, `isRelevant`, and rating scores are conditionally displayed based on page configuration
- `States` array is used for state selection UI when an article is selected
- `isApproved` affects row styling in the table
