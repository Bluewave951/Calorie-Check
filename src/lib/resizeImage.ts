async function loadBitmap(file: Blob): Promise<ImageBitmap> {
  // imageOrientation: "from-image" หมุนรูปตามข้อมูล EXIF ของกล้องมือถือ
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

function drawScaled(bitmap: ImageBitmap, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("เบราว์เซอร์นี้ไม่รองรับการย่อรูป");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export interface PreparedImage {
  /** JPEG base64 (~768px) สำหรับส่งให้ AI */
  base64: string;
  /** รูปย่อ ~240px (data URL) สำหรับเก็บในประวัติ */
  thumbnail: string;
  /** รูปสำหรับแสดงระหว่างรอ */
  previewUrl: string;
}

/** ย่อรูปฝั่ง client ก่อนส่ง เพื่อให้ AI ตอบเร็วขึ้นมาก */
export async function prepareImage(file: Blob): Promise<PreparedImage> {
  const bitmap = await loadBitmap(file);
  try {
    const large = drawScaled(bitmap, 768).toDataURL("image/jpeg", 0.85);
    const thumbnail = drawScaled(bitmap, 240).toDataURL("image/jpeg", 0.75);
    return { base64: large.slice(large.indexOf(",") + 1), thumbnail, previewUrl: large };
  } finally {
    bitmap.close();
  }
}
