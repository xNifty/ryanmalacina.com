document.addEventListener("DOMContentLoaded", function() {
  if (window.trustedTypes) {
    // Define a Trusted Types policy named 'default'
    const policy = trustedTypes.createPolicy('default', {
      createHTML: (string) => string,
    });

    // Wrap jQuery methods to use TrustedHTML
    const originalHtmlMethod = $.fn.html;
    $.fn.html = function(htmlString) {
      if (typeof htmlString === "string") {
        return originalHtmlMethod.call(this, policy.createHTML(htmlString));
      }
      return originalHtmlMethod.apply(this, arguments);
    };

    const originalAppendMethod = $.fn.append;
    $.fn.append = function(htmlString) {
      if (typeof htmlString === "string") {
        return originalAppendMethod.call(this, policy.createHTML(htmlString));
      }
      return originalAppendMethod.apply(this, arguments);
    };

    const originalPrependMethod = $.fn.prepend;
    $.fn.prepend = function(htmlString) {
      if (typeof htmlString === "string") {
        return originalPrependMethod.call(this, policy.createHTML(htmlString));
      }
      return originalPrependMethod.apply(this, arguments);
    };

    // Configure HTMX to use the Trusted Types policy
    if (window.htmx) {
      htmx.onLoad(function() {
        htmx.config.includeIndicatorStyles = false;
        htmx.config.defaultSwapStyle = 'none';

        // Override the default innerHTML assignment to use Trusted Types
        htmx._.innerHTML = function(el, html) {
          el.innerHTML = policy.createHTML(html);
        };
      });

      htmx.config.nonce = nonce;
      htmx.config.inlineStyleNonce = nonce;
      htmx.config.inlineScriptNonce = nonce;
      htmx.config.includeIndicatorStyles = false;
    } else {
      console.error('HTMX is not loaded.');
    }
  } else {
    console.warn('Trusted Types API is not supported in this browser.');
  }
});
