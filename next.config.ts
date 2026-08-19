import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Картинки из public/ по умолчанию отдаются с max-age=0 и перекачиваются
  // на каждый заход. Имя файла меняем вручную при замене логотипа.
  async headers() {
    return [
      {
        source: "/:file(logo-mark\\.(?:png|webp)|icon\\.png)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
