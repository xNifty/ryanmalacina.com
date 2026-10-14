/*
  Flash messages: shown once on the next page, stored in the session. Replaces connect-flash,
  which is unmaintained and calls the deprecated util.isArray. Same API, minus printf-style
  formatting (nothing here used it):

    req.flash("error", "Nope.")        // queue one (or pass an array); returns the queue length
    req.flash("error")                 // read and clear that type -> ["Nope."]
    req.flash()                        // read and clear everything -> { error: [...] }
*/

function flashMessages(type, message) {
  if (this.session === undefined) throw new Error("req.flash() requires sessions");
  const messages = (this.session.flash ??= {});

  if (type && message !== undefined && message !== null && message !== "") {
    const queue = (messages[type] ??= []);
    queue.push(...(Array.isArray(message) ? message : [message]));
    return queue.length;
  }

  if (type) {
    const queue = messages[type] ?? [];
    delete messages[type];
    return queue;
  }

  this.session.flash = {};
  return messages;
}

/**
 * Middleware adding req.flash. Must come after the session middleware.
 */
export default function flash() {
  return function(req, res, next) {
    req.flash ??= flashMessages;
    next();
  };
}
