// webpack.config.mjs

import { readdirSync, statSync } from "fs";
import { fileURLToPath, URL } from "url";
import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { WebpackManifestPlugin } from "webpack-manifest-plugin";

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
      files.push(...getAllFiles(contentPath));
    } else {
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
    extensions: [".js", ".handlebars"], // Add this line
  },
  entry: {
    "admin-news": "@js/admin-news.js",
    admin: "@js/admin.js",
    "jquery.simplePagination": "@js/jquery.simplePagination.js",
    news: "@js/news.js",
    profile: "@js/profile.js",
    site: "@js/site.js",
    simplePagination: "@css/simplePagination.css",
    style: "@css/style.css",
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
    new WebpackManifestPlugin(),
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
