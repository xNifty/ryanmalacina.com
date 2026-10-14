const defaultSrc = [];
const scriptSrc = [
  `https://cdnjs.cloudflare.com/`,
  `https://unpkg.com`,
  `https://www.google.com/recaptcha/`,
  `https://www.gstatic.com/recaptcha/`,
  `'strict-dynamic'`,
];
const styleSrc = [
  `https://cdnjs.cloudflare.com`,
  `https://fonts.googleapis.com`,
];
const styleSrcAttr = [`'none'`];
const imgSrc = [`https://i.imgur.com`, `*.s3.amazonaws.com`, `https://github.githubassets.com`, `https://github.com/user-attachments/`];
const connectSrc = [`https://www.google.com/recaptcha/`];
const fontSrc = [
  `https://fonts.gstatic.com`,
];
const frameSrc = [`https://www.google.com/recaptcha/`];
const reportUri = [];
const requireTrustedTypesFor = ["'script'"];

export default {
  defaultSrc,
  scriptSrc,
  styleSrc,
  styleSrcAttr,
  imgSrc,
  connectSrc,
  fontSrc,
  frameSrc,
  reportUri,
  requireTrustedTypesFor,
};
