const defaultSrc = [];
const scriptSrc = [
  `https://cdnjs.cloudflare.com/`,
  `https://unpkg.com`,
  `https://challenges.cloudflare.com`,
  `'strict-dynamic'`,
];
const styleSrc = [
  `https://cdnjs.cloudflare.com`,
  `https://fonts.googleapis.com`,
];
const styleSrcAttr = [`'none'`];
const imgSrc = [`https://i.imgur.com`, `*.s3.amazonaws.com`, `https://github.githubassets.com`, `https://github.com/user-attachments/`];
const connectSrc = [];
const fontSrc = [
  `https://fonts.gstatic.com`,
];
const frameSrc = [`https://challenges.cloudflare.com`];
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
