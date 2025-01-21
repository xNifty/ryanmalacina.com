import path from "path";
import { fileURLToPath } from "url";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { WebpackManifestPlugin } from "webpack-manifest-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  resolve: {
    alias: {
      "@js": path.resolve(__dirname, "public/js"),
      "@css": path.resolve(__dirname, "public/css"),
    },
    extensions: [".js"],
  },
  entry: {
    admin: "@js/admin.js",
    "jquery.simplePagination": "@js/jquery.simplePagination.js",
    news: "@js/news.js",
    profile: "@js/profile.js",
    site: "@js/site.js",
    welcome: "@js/welcome.js",
    "update-project": "@js/update-project.js",
    trustedtype: "@js/trustedtype.js",
    simplePagination: "@css/simplePagination.css",
    style: "@css/style.css",
    github: "@css/github.css",
    githubdark: "@css/githubdark.css",
  },
  output: {
    filename: "js/[name].[contenthash].js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
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
