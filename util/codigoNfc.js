export function codigoNfcDocta(texto) {
  const raw = String(texto || "")
    .replace(/\u0000/g, "")
    .trim();
  const match = raw.match(/DOCTA\|nfc\|([A-Za-z0-9._-]{2,80})/i);
  return match ? match[1] : "";
}

export function codigoQrDocta(texto) {
  const raw = String(texto || "")
    .replace(/\u0000/g, "")
    .trim();
  const match = raw.match(/DOCTA\|qr\|([A-Za-z0-9._-]{2,80})/i);
  return match ? match[1] : "";
}

export function textoDeTagNfc(tag, Ndef) {
  const records = Array.isArray(tag?.ndefMessage) ? tag.ndefMessage : [];
  for (const record of records) {
    try {
      const texto = Ndef.text.decodePayload(record.payload);
      if (texto) return texto;
    } catch {
      // otro tipo de registro
    }
    try {
      const uri = Ndef.uri.decodePayload(record.payload);
      if (uri) return uri;
    } catch {
      // no es uri
    }
  }
  return "";
}
