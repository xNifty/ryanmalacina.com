import mailgunConfig from "../config/mailgunConfig.js";
import logErrorToFile from "./errorLogging.js";
import handleResponse from "./responseHandler.js";

const { mg, domain } = mailgunConfig;

// export async function sendMailAndRespond(
//   fromEmail,
//   toEmail,
//   subject,
//   text,
//   res
// ) {
//   try {
//     const messageOptions = createMessageOptions(
//       fromEmail,
//       toEmail,
//       subject,
//       text
//     );

//     await mg.messages.create(domain, messageOptions);

//     return handleResponse(res, "Updated Successfully", 200);
//   } catch (err) {
//     logErrorToFile(err);

//     return handleResponse(res, "Error", 400);
//   }
// }

export async function sendMail(
  fromEmail,
  toEmail,
  subject,
  text,
  ishtml,
  returnJson = false,
  res = false
) {
  try {
    const messageOptions = createMessageOptions(
      fromEmail,
      toEmail,
      subject,
      text,
      ishtml
    );

    await mg.messages.create(domain, messageOptions);

    if (returnJson) {
      return handleResponse(res, "Updated Successfully", 200);
    } else {
      return true;
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
