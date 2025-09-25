// Use the browser's built-in trustedTypes API
if (typeof trustedTypes !== 'undefined') {
  // Create a Trusted Types policy
  const policy = trustedTypes.createPolicy('default', {
    createHTML: (input) => input,
    createScript: (input) => input,
    createScriptURL: (input) => input
  });

  // Make the policy globally accessible
  window.trustedTypesPolicy = policy;
} else {
  // Fallback if trustedTypes is not available
  console.warn('Trusted Types not supported in this browser');
}
