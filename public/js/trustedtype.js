// Import the trusted-types library
import { trustedTypes } from 'trusted-types';

// Create a Trusted Types policy
const policy = trustedTypes.createPolicy('default', {
  createHTML: (input) => input,
  createScript: (input) => input,
  createScriptURL: (input) => input
});

// Make the policy globally accessible
window.trustedTypesPolicy = policy;
