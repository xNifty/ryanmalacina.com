import mailgunConfig from "../config/mailgunConfig";
import { sendMail, sendContactMessage } from "../utils/sendMail.js";
import logErrorToFile from "../utils/errorLogging.js";
import handleResponse from "../utils/responseHandler.js";

jest.mock("../config/mailgunConfig.js", () => ({
  mg: {
    messages: {
      create: jest.fn(),
    },
  },
  domain: "mockDomain",
}));

jest.mock("../utils/errorLogging.js", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../utils/responseHandler.js", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("Mail Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("sendMailAndRespond", () => {
    it("should send mail and respond with success", async () => {
      mailgunConfig.mg.messages.create.mockResolvedValueOnce();

      handleResponse.mockImplementationOnce((response, message, status) => {
        return { response, message, status };
      });

      const fromEmail = "from@example.com";
      const toEmail = "to@example.com";
      const subject = "Test Subject";
      const text = "Test Text";
      const res = {};
      const isJson = true;
      const isHtml = false;

      await sendMail(fromEmail, toEmail, subject, text, isHtml, isJson, res);

      expect(mailgunConfig.mg.messages.create).toHaveBeenCalledWith(
        "mockDomain",
        {
          from: fromEmail,
          to: toEmail,
          subject: subject,
          text: text,
        }
      );

      expect(handleResponse).toHaveBeenCalledWith(
        res,
        "Updated Successfully",
        200
      );
    });

    it("should log error and respond with an error", async () => {
      const mockError = new Error("Error sending mail");
      mailgunConfig.mg.messages.create.mockRejectedValueOnce(mockError);

      logErrorToFile.mockImplementationOnce(() => {});

      handleResponse.mockImplementationOnce((response, message, status) => {
        return { response, message, status };
      });

      const fromEmail = "from@example.com";
      const toEmail = "to@example.com";
      const subject = "Test Subject";
      const text = "Test Text";
      const res = {};
      const isJson = true;
      const isHtml = false;

      const result = await sendMail(
        fromEmail,
        toEmail,
        subject,
        text,
        isHtml,
        isJson,
        res
      );

      expect(logErrorToFile).toHaveBeenCalledWith(mockError);

      expect(handleResponse).toHaveBeenCalledWith(res, "Error", 400);

      expect(result).toEqual({
        response: res,
        message: "Error",
        status: 400,
      });
    });
  });

  describe("sendMailNoRedirect", () => {
    it("should send mail successfully without redirect", async () => {
      mailgunConfig.mg.messages.create.mockResolvedValueOnce();

      const fromEmail = "from@example.com";
      const toEmail = "to@example.com";
      const subject = "Test Subject";
      const text = "Test Text";
      const isHtml = false;

      const result = await sendMail(fromEmail, toEmail, subject, text, isHtml);

      expect(mailgunConfig.mg.messages.create).toHaveBeenCalledWith(
        "mockDomain",
        {
          from: fromEmail,
          to: toEmail,
          subject: subject,
          text: text,
        }
      );

      expect(result).toBe(true);
    });

    it("should log error and return false in case of an error", async () => {
      const mockError = new Error("Error sending mail");

      mailgunConfig.mg.messages.create.mockRejectedValueOnce(mockError);

      logErrorToFile.mockImplementationOnce(() => {});

      const fromEmail = "from@example.com";
      const toEmail = "to@example.com";
      const subject = "Test Subject";
      const text = "Test Text";
      const isHtml = false;

      const result = await sendMail(fromEmail, toEmail, subject, text, isHtml);

      expect(mailgunConfig.mg.messages.create).toHaveBeenCalledWith(
        "mockDomain",
        {
          from: fromEmail,
          to: toEmail,
          subject: subject,
          text: text,
        }
      );

      expect(logErrorToFile).toHaveBeenCalledWith(mockError);

      expect(result).toBe(false);
    });
  });

  describe("sendContactMessage", () => {
    const env = process.env;

    beforeEach(() => {
      process.env = { ...env, mailgunFromEmail: "site@example.com", mailgunToEmail: "owner@example.com" };
    });

    afterEach(() => {
      process.env = env;
    });

    it("should send plain text from the site address with the visitor in Reply-To", async () => {
      mailgunConfig.mg.messages.create.mockResolvedValueOnce();

      const result = await sendContactMessage("visitor@example.com", "Hi", "<b>not html</b>");

      expect(result).toBe(true);
      expect(mailgunConfig.mg.messages.create).toHaveBeenCalledWith("mockDomain", {
        from: "site@example.com",
        to: "owner@example.com",
        subject: "Hi",
        text: "<b>not html</b>",
        "h:Reply-To": "visitor@example.com",
      });
    });

    it("should log and return false when Mailgun fails", async () => {
      mailgunConfig.mg.messages.create.mockRejectedValueOnce(new Error("down"));

      const result = await sendContactMessage("visitor@example.com", "Hi", "text");

      expect(result).toBe(false);
      expect(logErrorToFile).toHaveBeenCalled();
    });
  });
});
