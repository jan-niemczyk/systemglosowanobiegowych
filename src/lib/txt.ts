export function txtResponse(filename: string, content: string): Response {
  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "no-store",
    },
  });
}
