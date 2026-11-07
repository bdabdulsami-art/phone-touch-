export async function fileToJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 1280;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("تعذر قراءة الصورة");
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.72;
  let url = canvas.toDataURL("image/jpeg", quality);
  while (url.length > 420_000 && quality > 0.42) {
    quality -= 0.1;
    url = canvas.toDataURL("image/jpeg", quality);
  }
  if (url.length > 480_000) throw new Error("الصورة كبيرة. اختار صورة أصغر.");
  return url;
}

const SHOP_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SHOP_MAX = 5 * 1024 * 1024;

export async function compressShopPhoto(file: File): Promise<string> {
  const type = file.type.toLowerCase();
  const extOk = /\.(jpe?g|png|webp)$/i.test(file.name);
  if ((type && !SHOP_TYPES.has(type)) || (!type && !extOk)) {
    throw new Error("الصور المسموحة JPG أو PNG أو WebP فقط");
  }
  if (file.size > SHOP_MAX) throw new Error("الصورة لازم تكون أصغر من ٥ ميجا");
  const bitmap = await createImageBitmap(file);
  const max = 1600;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("تعذر قراءة الصورة");
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.82;
  let blob = await canvasToJpeg(canvas, quality);
  while (blob.size > 1_200_000 && quality > 0.5) {
    quality -= 0.1;
    blob = await canvasToJpeg(canvas, quality);
  }
  if (blob.size > SHOP_MAX) throw new Error("الصورة كبيرة. اختار صورة أصغر.");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("تعذر ضغط الصورة"))),
      "image/jpeg",
      quality,
    );
  });
}
