const logger = require("../logger");

/**
 * Format article state assignment data for the frontend
 * @param {Array} rawResults - Raw SQL query results
 * @returns {Array} Formatted articles with state assignment data
 */
function formatArticlesWithStateAssignments(rawResults) {
  logger.info(`Formatting ${rawResults.length} articles`);

  return rawResults.map((row) => ({
    id: row.articleId,
    title: row.title,
    description: row.description,
    url: row.url,
    createdAt: row.createdAt,
    stateAssignment: {
      promptId: row.promptId,
      isHumanApproved: row.isHumanApproved,
      isDeterminedToBeError: row.isDeterminedToBeError,
      occuredInTheUS: row.occuredInTheUS,
      reasoning: row.reasoning,
      stateId: row.stateId,
      stateName: row.stateName,
    },
  }));
}

/**
 * Validate request parameters for state-assigner endpoint
 * @param {Object} body - Request body
 * @returns {Object} Object with isValid and error properties
 */
function validateStateAssignerRequest(body) {
  const { includeNullState } = body;

  // includeNullState is optional, but if provided it should be boolean
  if (
    includeNullState !== undefined &&
    typeof includeNullState !== "boolean"
  ) {
    return {
      isValid: false,
      error: "includeNullState must be a boolean value if provided",
    };
  }

  return { isValid: true };
}

/**
 * Validate request parameters for human-verify endpoint
 * @param {Object} body - Request body
 * @returns {Object} Object with isValid and error properties
 */
function validateHumanVerifyRequest(body) {
  const { action, stateId } = body;

  // action is required and must be "approve" or "reject"
  if (!action) {
    return {
      isValid: false,
      error: "action field is required",
    };
  }

  if (action !== "approve" && action !== "reject") {
    return {
      isValid: false,
      error: 'action must be either "approve" or "reject"',
    };
  }

  // stateId is required and must be a number
  if (stateId === undefined || stateId === null) {
    return {
      isValid: false,
      error: "stateId field is required",
    };
  }

  if (typeof stateId !== "number" || isNaN(stateId)) {
    return {
      isValid: false,
      error: "stateId must be a valid number",
    };
  }

  return { isValid: true };
}

module.exports = {
  formatArticlesWithStateAssignments,
  validateStateAssignerRequest,
  validateHumanVerifyRequest,
};
