import mailgunConfig from "../config/mailgunConfig";
import handleResponse from "./responseHandler";

const { mg, domain } = mailgunConfig;

export async function sendMailAndRespond(
  fromEmail,
  toEmail,
  subject,
  text,
  res
) {
  try {
    const messageOptions = createMessageOptions(
      fromEmail,
      toEmail,
      subject,
      text
    );

    await mg.messages.create(domain, messageOptions);

    return handleResponse(res, "Updated Successfully", 200);
  } catch (err) {
    console.log(`Error: ${err.message}`);

    return handleResponse(res, "Error", 400);
  }
}

export async function sendMailNoRedirect(
  fromEmail,
  toEmail,
  subject,
  text,
  ishtml
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
    return true;
  } catch (err) {
    console.log(`Error: ${err.message}`);
    return false;
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
  sendMailAndRespond,
  sendMailNoRedirect,
};
