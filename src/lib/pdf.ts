import path from "path";

/**
 * Generator PDF po stronie serwera (pdfmake/src/printer, Node). Dokumenty są
 * celowo czarno-białe (sekcja 11 koncepcji). Font Lato pobierany jest do
 * public/fonts przy budowie obrazu Dockera (patrz Dockerfile).
 */
const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

const fontDescriptors = {
  Lato: {
    normal: path.join(FONTS_DIR, "Lato-Regular.ttf"),
    bold: path.join(FONTS_DIR, "Lato-Bold.ttf"),
    italics: path.join(FONTS_DIR, "Lato-Italic.ttf"),
    bolditalics: path.join(FONTS_DIR, "Lato-BoldItalic.ttf"),
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfDocDefinition = any;

export async function renderPdf(docDefinition: PdfDocDefinition): Promise<Buffer> {
  // Import dynamiczny (CommonJS) - unika ładowania implementacji przeglądarkowej podczas builda.
  const { default: PdfPrinter } = await import("pdfmake/src/printer.js" as string);
  const printer = new PdfPrinter(fontDescriptors);
  const doc = printer.createPdfKitDocument({ defaultStyle: { font: "Lato", fontSize: 10 }, ...docDefinition });
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export function pdfResponse(filename: string, buffer: Buffer): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "no-store",
    },
  });
}
