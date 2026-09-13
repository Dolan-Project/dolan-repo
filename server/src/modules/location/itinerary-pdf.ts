function escapePdf(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function renderItineraryPdf(title: string, lines: string[]): Buffer {
  const content = [`BT /F1 12 Tf 50 780 Td (${escapePdf(title)}) Tj`, " /F1 10 Tf"]
    .concat(lines.slice(0, 40).map((line) => ` 0 -16 Td (${escapePdf(line)}) Tj`))
    .concat(["ET"])
    .join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];
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
  const pdf = `%PDF-1.4\n${body}xref\n0 6\n${xref.join("\n")}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`;
  return Buffer.from(pdf);
}
