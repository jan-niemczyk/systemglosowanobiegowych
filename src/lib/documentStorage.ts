import path from "path";

/**
 * Katalog dokumentów spraw - CELOWO poza `public/`, żeby pliki nie były
 * dostępne bez przejścia przez kontrolę uprawnień w /api/documents/[id].
 * W Dockerze montowany jako osobny wolumen (patrz docker-compose.yml).
 */
export const DOCUMENT_STORAGE_DIR = process.env.DOCUMENT_STORAGE_DIR ?? path.join(process.cwd(), "storage", "documents");

export function documentFilePath(storedName: string): string {
  return path.join(DOCUMENT_STORAGE_DIR, storedName);
}
