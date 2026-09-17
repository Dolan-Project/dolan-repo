function escapePdf(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export const PDF_LINES_PER_PAGE = 46;

export function paginatePdfLines(lines: string[], perPage = PDF_LINES_PER_PAGE): string[][] {
  if (!lines.length) return [[]];
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += perPage) {
    pages.push(lines.slice(index, index + perPage));
  }
  return pages;
}

export function renderItineraryPdf(title: string, lines: string[]): Buffer {
  const pages = paginatePdfLines(lines);
  const fontObj = 3;
  let nextId = 4;
  const pageEntries = pages.map((pageLines, index) => {
    const pageNum = nextId;
    nextId += 1;
    const contentNum = nextId;
    nextId += 1;
    const heading = index === 0 ? title : `${title} (${index + 1}/${pages.length})`;
    const content = [
      `BT /F1 14 Tf 50 760 Td (${escapePdf(heading)}) Tj`,
      " /F1 10 Tf",
      ...pageLines.map((line) => ` 0 -14 Td (${escapePdf(line)}) Tj`),
      ` 0 -18 Td (${escapePdf(`Halaman ${index + 1} / ${pages.length}`)}) Tj`,
      "ET",
    ].join("\n");
    return { pageNum, contentNum, content };
  });

  const kids = pageEntries.map((page) => `${page.pageNum} 0 R`).join(" ");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    `2 0 obj << /Type /Pages /Kids [${kids}] /Count ${pageEntries.length} >> endobj`,
    "3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];
  for (const page of pageEntries) {
    objects.push(
      `${page.pageNum} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${page.contentNum} 0 R /Resources << /Font << /F1 ${fontObj} 0 R >> >> >> endobj`,
    );
    objects.push(
      `${page.contentNum} 0 obj << /Length ${Buffer.byteLength(page.content)} >> stream\n${page.content}\nendstream endobj`,
    );
  }

  let offset = 9;
  const xref = ["0000000000 65535 f "];
  const body = objects
    .map((object) => {
      xref.push(`${String(offset).padStart(10, "0")} 00000 n `);
      const chunk = `${object}\n`;
      offset += Buffer.byteLength(chunk);
      return chunk;
    })
    .join("");
  const pdf = `%PDF-1.4\n${body}xref\n0 ${objects.length + 1}\n${xref.join("\n")}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`;
  return Buffer.from(pdf);
}
