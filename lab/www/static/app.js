/* Fixture lab front-end — discovery of nested API routes */
(function () {
  var API_BASE = "/api/v1";
  var endpoints = {
    status: API_BASE + "/status",
    users: API_BASE + "/users",
    health: "/actuator/health",
    graphql: "/graphql",
    openapi: "/openapi.json"
  };
  // Intentional discoverable strings for recon agents (no auth, no secrets)
  window.__FIXTURE_API__ = endpoints;
  console.log("fixture api map", endpoints);
})();
