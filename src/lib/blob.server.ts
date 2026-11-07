/**
 * Shop photos. Server-only: BLOB_READ_WRITE_TOKEN is never sent to the browser.
 */
import { put } from "@vercel/blob";

export async function storeShopImage(
  bytes: Buffer,
  contentType: "image/jpeg" | "image/png" | "image/webp",
  shopId: number,
) {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    console.error("[blob] missing BLOB_READ_WRITE_TOKEN");
    throw new Error("تخزين الصور غير جاهز. اضبط BLOB_READ_WRITE_TOKEN على السيرفر");
  }
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  try {
    const blob = await put(`shops/${shopId}/${Date.now()}.${ext}`, bytes, {
      access: "public",
      contentType,
      token,
    });
    return blob.url;
  } catch (err) {
    const message = err instanceof Error ? err.message : "upload failed";
    console.error(
      "[blob] upload_failed",
      JSON.stringify({ shopId, message: message.replaceAll(token, "[redacted]").slice(0, 180) }),
    );
    throw new Error("تعذر حفظ الصورة");
  }
}
