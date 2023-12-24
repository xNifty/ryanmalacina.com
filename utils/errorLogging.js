import fs from "fs";

const logErrorToFile = (error) => {
  const errorDirectory = "errors";
  const errorFilePath = `${errorDirectory}/error_${Date.now()}.log`;

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (!fs.existsSync(errorDirectory)) {
      fs.mkdirSync(errorDirectory);
    }

    const errorMessage = `${error.message}\n\n${error.stack}`;

    fs.writeFileSync(errorFilePath, errorMessage);
  } else {
    console.log(`${error.message}\n\n${error.stack}`);
  }
};

export default logErrorToFile;
