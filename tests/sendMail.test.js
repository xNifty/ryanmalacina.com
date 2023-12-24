import mailgunConfig from "../config/mailgunConfig";
import { sendMailAndRespond, sendMailNoRedirect } from "../utils/sendMail.js";
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

      await sendMailAndRespond(fromEmail, toEmail, subject, text, res);

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

      const result = await sendMailAndRespond(
        fromEmail,
        toEmail,
        subject,
        text,
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

      const result = await sendMailNoRedirect(
        fromEmail,
        toEmail,
        subject,
        text,
        isHtml
      );

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

      const result = await sendMailNoRedirect(
        fromEmail,
        toEmail,
        subject,
        text,
        isHtml
      );

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
});
