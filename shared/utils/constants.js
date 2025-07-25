const ACCOUNTS_CONSTANTS = {
  STATUS_200: "200",
  MESSAGE_200: "Request processed successfully",
  STATUS_201: "201", 
  MESSAGE_201: "Account created successfully",
  STATUS_417: "417",
  MESSAGE_417_UPDATE: "Update operation failed. Please try again or contact Dev team",
  MESSAGE_417_DELETE: "Delete operation failed. Please try again or contact Dev team"
};

const AUTH_CONSTANTS = {
  STATUS_200: "200",
  MESSAGE_200: "Request processed successfully",
  STATUS_201: "201",
  MESSAGE_201: "Authentication successful",
  STATUS_401: "401",
  MESSAGE_401: "Unauthorized access",
  STATUS_403: "403",
  MESSAGE_403: "Forbidden access"
};

const USERS_CONSTANTS = {
  STATUS_200: "200",
  MESSAGE_200: "Request processed successfully",
  STATUS_201: "201",
  MESSAGE_201: "User created successfully",
  STATUS_417: "417",
  MESSAGE_417_UPDATE: "Update operation failed. Please try again or contact Dev team",
  MESSAGE_417_DELETE: "Delete operation failed. Please try again or contact Dev team"
};


module.exports = {
  ACCOUNTS_CONSTANTS,
  AUTH_CONSTANTS,
  USERS_CONSTANTS
};
