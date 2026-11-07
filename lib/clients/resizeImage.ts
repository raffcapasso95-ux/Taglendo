/** Prepara la foto di un cliente nel browser: quadrato centrato da 256 px, JPEG. Così pesa poche decine di KB. */
const PHOTO_SIZE = 256;

export async function resizePhoto(file: File, size = PHOTO_SIZE): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas non disponibile");
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) throw new Error("conversione non riuscita");
    return blob;
  } finally {
    bitmap.close();
  }
}
