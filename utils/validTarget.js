import config from "config";

function ValidTarget(path) {
  let returnUrl;
  let rootURL;

  try {
    rootURL = new URL(config.get("rootURL"));
    returnUrl = new URL(path);
  } catch (e) {
    return false;
  }

  const result = rootURL.hostname === returnUrl.hostname;

  return result;
}

export default ValidTarget;
