# API Reference - News Nexus 10 API

This document provides comprehensive documentation for API endpoints in the News Nexus 10 API service.

## Documentation Standards

All endpoint documentation should follow this concise structure:

### Required Sections

1. **Endpoint Heading** - HTTP method and path (e.g., `## POST /articles/endpoint-name`)
2. **Brief Description** - One sentence describing what the endpoint does
3. **Authentication** - `**Authentication:** Required (JWT token)` or `Not required`
4. **Sample Request** - curl example showing typical usage with headers and body
5. **Response Examples** - Success response (200) and relevant error responses (400, 404, 500)
6. **Behavior** (optional) - Key points about how the endpoint works, special logic, or important notes

### Optional Sections

- **Request Body Fields** - Table of parameters (if complex)
- **Response Fields** - Description of response structure (if complex)
- **URL Parameters** - For parameterized routes

### Format Guidelines

- Keep descriptions **concise** - avoid verbose explanations
- Use **code blocks** for all JSON examples
- Include **realistic data** in examples
- Use **tables** for parameter lists
- Keep **bullet points brief** in Behavior sections
- Follow the format shown in `docs/api/analysis/llm04.md` as the reference standard

### Anti-patterns to Avoid

- ❌ Long prose explanations
- ❌ Multiple redundant examples
- ❌ Excessive "Important Notes" sections
- ❌ Verbose field descriptions
- ❌ Integration code examples (unless truly necessary)

## Main Routes

- [/core/articles](./api/articles.md) : Article management
- [/core/articles-approveds](./api/articles-approveds.md) : Article approval management

## Analysis Routes

- [/analysis/deduper](./api/analysis/deduper.md) : Deduplicate articles
- [/analysis/llm01](./api/analysis/llm01.md) : LLM Analysis with ChatGPT
- [/analysis/llm02](./api/analysis/llm02.md) : Article approval workflow utilities
- [/analysis/llm04](./api/analysis/llm04.md) : Article approval workflow utilities
