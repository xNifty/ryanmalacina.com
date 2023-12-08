// webpack.config.mjs

import { readdirSync, statSync } from "fs";
import { fileURLToPath, URL } from "url";
import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateHtmlPlugins(templateDir) {
  const templateFiles = getAllFiles(path.resolve(__dirname, templateDir));

  return templateFiles.map((filePath) => {
    const relativePath = path.relative(
      path.resolve(__dirname, templateDir),
      filePath
    );

    const parts = relativePath.split(".");
    const name = parts[0];

    return new HtmlWebpackPlugin({
      filename: `${name}.html`,
      template: filePath,
      chunks: [name],
    });
  });
}

function getAllFiles(dir) {
  const files = [];
  const dirContents = readdirSync(dir);

  dirContents.forEach((content) => {
    const contentPath = path.join(dir, content);
    if (statSync(contentPath).isDirectory()) {
      // If it's a directory, recursively get files
      files.push(...getAllFiles(contentPath));
    } else {
      // If it's a file, add it to the list
      files.push(contentPath);
    }
  });

  return files;
}

const config = {
  resolve: {
    alias: {
      "@js": path.resolve(__dirname, "public/js"),
      "@css": path.resolve(__dirname, "public/css"),
    },
  },
  entry: {
    file1: "@js/admin-news.js",
    file2: "@js/admin.js",
    file3: "@js/jquery.simplePagination.js",
    file4: "@js/news.js",
    file5: "@js/profile.js",
    file6: "@js/site.js",
    style1: "@css/simplePagination.css",
    style2: "@css/style.css",
  },
  output: {
    filename: "js/[name].[contenthash].js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    ...generateHtmlPlugins("./views"),
    new MiniCssExtractPlugin({
      filename: "css/[name].[contenthash].css",
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
    ],
  },
};

export default config;
