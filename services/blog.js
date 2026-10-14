/*
  Recent posts from the Ghost blog, for the home page. Only called while the blog is switched
  on in /admin/settings.
*/
import config from "config";
import GhostContentAPI from "@tryghost/content-api";
import dateFormat from "dateformat";

/**
 * @returns {Promise<Object[]>} - Up to five public posts, newest first, each with formatted_date
 * @throws If Ghost is unreachable or doesn't answer with posts
 */
export async function listRecentPosts() {
  const ghost = new GhostContentAPI({
    url: config.get("blogURL"),
    key: process.env.blogAPI,
    version: config.get("blogVersion"),
  });

  const result = await ghost.posts.browse({
    filter: "visibility: public",
    limit: 5,
    order: "published_at desc",
  });

  // The client returns a lone post as an object, and whatever else the server sent (e.g. an
  // HTML page, when blogURL redirects to a website) as undefined
  let posts;
  if (Array.isArray(result)) posts = result;
  else if (result && typeof result === "object" && result.id) posts = [result];
  else throw new Error(`${config.get("blogURL")} didn't answer with blog posts; check blogURL`);

  return posts.map((post) => ({
    ...post,
    formatted_date:
      dateFormat(post.published_at, "mmmm dS, yyyy") + " @ " + dateFormat(post.published_at, "h:MM TT"),
  }));
}

export default { listRecentPosts };
