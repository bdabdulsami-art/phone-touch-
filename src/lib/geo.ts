export const ASYUT = { lat: 27.1809, lng: 31.1837 };

export function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function readGps() {
  return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("الموقع مش متاح من المتصفح"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error("مقدرناش نقرأ الموقع. حرّك الدبوس على الخريطة.")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}
