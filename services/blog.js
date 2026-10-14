/*
  Recent posts from the Ghost blog, for the home page.
*/
import config from "config";
import GhostContentAPI from "@tryghost/content-api";
import dateFormat from "dateformat";

/**
 * @returns {Promise<Object[]>} - Up to five public posts, newest first, each with formatted_date
 */
export async function listRecentPosts() {
  const ghost = new GhostContentAPI({
    url: config.get("blogURL"),
    key: process.env.blogAPI,
    version: config.get("blogVersion"),
  });

  const posts = await ghost.posts.browse({
    filter: "visibility: public",
    limit: 5,
    order: "published_at desc",
  });

  return posts.map((post) => ({
    ...post,
    formatted_date:
      dateFormat(post.published_at, "mmmm dS, yyyy") + " @ " + dateFormat(post.published_at, "h:MM TT"),
  }));
}

export default { listRecentPosts };
