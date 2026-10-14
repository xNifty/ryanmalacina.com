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
    // Paired entries share a chunk, so the manifest has both e.g. site.js and site.css
    admin: ["@js/admin.js", "@css/admin.css"],
    site: ["@js/site.js", "@css/site.css"],
    profile: "@js/profile.js",
    theme: "@js/theme.js",
    trustedtype: "@js/trustedtype.js",
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
