import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The home page used to be served at /home (app/home/page.tsx); it now
  // lives at app/page.tsx (served at /) so "/" doesn't 404. This keeps any
  // existing /home links/bookmarks working with a permanent redirect
  // instead of a dead end.
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
