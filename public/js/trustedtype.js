(function () {
  const passthroughPolicy = {
    createHTML: (input) => input,
    createScript: (input) => input,
    createScriptURL: (input) => input,
  };

  if (window.trustedTypesPolicy) {
    return;
  }

  if (!window.trustedTypes || !window.trustedTypes.createPolicy) {
    window.trustedTypesPolicy = passthroughPolicy;
    return;
  }

  // The default policy lets existing server-rendered HTMX swaps pass through
  // Trusted Types sinks while CSP enforcement is enabled.
  window.trustedTypesPolicy = window.trustedTypes.createPolicy("default", passthroughPolicy);
})();
