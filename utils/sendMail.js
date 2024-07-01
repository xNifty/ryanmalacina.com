import mailgunConfig from "../config/mailgunConfig.js";
import logErrorToFile from "./errorLogging.js";
import handleResponse from "./responseHandler.js";

const { mg, domain } = mailgunConfig;

export async function sendMail(
  fromEmail,
  toEmail,
  subject,
  text,
  ishtml = false,
  returnJson = false,
  res = false
) {
  let success = false;
  try {
    const messageOptions = createMessageOptions(
      fromEmail,
      toEmail,
      subject,
      text,
      ishtml
    );

    await mg.messages.create(domain, messageOptions)
    .then((msg) => success = true)
    .catch((err) => { success = false; logErrorToFile(err); });

    if (returnJson && success) {
      return handleResponse(res, "Updated Successfully", 200);
    } else if (!returnJson && success) {
      return true;
    } else if (returnJson && !success) {
      return handleResponse(res, "Error", 400);
    } else {
      return false;
    }
  } catch (err) {
    logErrorToFile(err);

    if (returnJson) {
      return handleResponse(res, "Error", 400);
    } else {
      return false;
    }
  }
}

function createMessageOptions(fromEmail, toEmail, subject, text, ishtml) {
  const messageOptions = {
    from: fromEmail,
    to: toEmail,
    subject: subject,
  };

  if (ishtml) {
    messageOptions.html = text;
  } else {
    messageOptions.text = text;
  }

  return messageOptions;
}

export default {
  // sendMailAndRespond,
  sendMailNoRedirect: sendMail,
};
