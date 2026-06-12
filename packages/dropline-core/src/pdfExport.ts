import { jsPDF } from 'jspdf';
import { compiledText, type CompileOptions } from './manuscriptCompiler.js';
import { downloadBlob } from './zipStore.js';

const MARGIN_PT = 72;
const LINE_HEIGHT_PT = 14;

export function buildPdfBlob(options: CompileOptions): Blob {
  const text = compiledText(options);
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - MARGIN_PT * 2;

  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }
    const wrapped = doc.splitTextToSize(paragraph, maxWidth) as string | string[];
    if (Array.isArray(wrapped)) lines.push(...wrapped);
    else lines.push(wrapped);
  }

  let y = MARGIN_PT;
  for (const line of lines) {
    if (y > pageHeight - MARGIN_PT) {
      doc.addPage();
      y = MARGIN_PT;
    }
    if (line) doc.text(line, MARGIN_PT, y);
    y += LINE_HEIGHT_PT;
  }

  return doc.output('blob');
}

export function downloadPdf(options: CompileOptions, filename: string): void {
  const blob = buildPdfBlob(options);
  const name = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  downloadBlob(blob, name);
}
