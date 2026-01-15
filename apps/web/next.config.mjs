/** @type {import('next').NextConfig} */
const apiProxyTarget = (process.env.API_PROXY_TARGET ||
  "http://localhost:4000"
).replace(/\/$/, "");

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/c4c/:path*",
        destination: `${apiProxyTarget}/c4c/:path*`
      }
    ];
  }
};

export default nextConfig;
