function rtfEscape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\t/g, '\\tab ')
    .replace(/\n/g, '\\par\n');
}

/** Minimal RTF document from plain text (binder import bundle). */
export function plainToRtf(plain: string): string {
  const body = rtfEscape(plain);
  return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\froman Times New Roman;}}\\f0\\fs24 ${body}}`;
}

export function rtfBytes(plain: string): Uint8Array {
  return new TextEncoder().encode(plainToRtf(plain));
}
