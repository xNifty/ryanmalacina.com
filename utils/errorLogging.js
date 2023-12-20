import fs from "fs";

const logErrorToFile = (errorMessage) => {
  const errorDirectory = "errors";
  const errorFilePath = `${errorDirectory}/error_${Date.now()}.log`;

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (!fs.existsSync(errorDirectory)) {
      fs.mkdirSync(errorDirectory);
    }

    fs.writeFileSync(errorFilePath, errorMessage);
  } else {
    console.log("Error: ", errorMessage);
  }
};

export default logErrorToFile;
