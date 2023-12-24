import config from "config";

function isLocalUrl(path) {
  try {
    return new URL(path).hostname === config.get("rootURL");
  } catch (e) {
    return false;
  }
}

export default isLocalUrl;
