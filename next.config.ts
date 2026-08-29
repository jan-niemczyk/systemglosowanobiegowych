import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  // pdfmake (przez @foliojs-fork/pdfkit -> unicode-trie/linebreak) czyta przy starcie
  // binarny plik danych (data.trie) ścieżką względną do __dirname. Zbundlowanie tego
  // pakietu przez webpack zrywa tę ścieżkę (plik nie trafia do chunku), więc PDF-y
  // nigdy się nie generują. Wyłączone z bundlowania - ładowane natywnym require()
  // wprost z node_modules w obrazie, gdzie plik faktycznie istnieje.
  serverExternalPackages: ["pdfmake"],
  // Bootstrap 5.3 wciąż używa wewnętrznie starszej składni Sass (@import, mix()) -
  // silnik Dart Sass zgłasza na to deprecation warnings przy każdym buildzie.
  // Nieszkodliwe (Bootstrap jeszcze tego nie naprawił), ale zaśmiecają log - wyciszone.
  sassOptions: {
    quietDeps: true,
    silenceDeprecations: ["import", "color-functions", "global-builtin"],
  },
};

export default nextConfig;
