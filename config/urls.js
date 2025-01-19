const defaultSrc = [];
const scriptSrc = [
  `https://cdnjs.cloudflare.com`,
  `https://code.jquery.com`,
  `https://maxcdn.bootstrapcdn.com`,
  `https://cdn.jsdelivr.net`,
  `https://www.google.com/recaptcha/`,
  `https://www.gstatic.com/recaptcha/`,
  `'strict-dynamic'`,
  `'unsafe-inline'`,
];
const styleSrc = [
  `https://cdnjs.cloudflare.com`,
  `https://fonts.googleapis.com`,
  `https://maxcdn.bootstrapcdn.com`,
  `https://cdn.jsdelivr.net`,
];
const imgSrc = [`https://i.imgur.com`];
const connectSrc = [`https://cdn.jsdelivr.net`];
const fontSrc = [
  `https://cdnjs.cloudflare.com`,
  `https://fonts.gstatic.com`,
  `https://maxcdn.bootstrapcdn.com`,
];
const frameSrc = [`https://www.google.com/recaptcha/`];
const reportUri = [];
const requireTrustedTypesFor = ["'script'"];

export default {
  defaultSrc,
  scriptSrc,
  styleSrc,
  imgSrc,
  connectSrc,
  fontSrc,
  frameSrc,
  reportUri,
  requireTrustedTypesFor,
};
