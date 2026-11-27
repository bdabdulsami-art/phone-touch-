import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { directionsUrl } from "@/lib/geo";

export function PinMap({
  lat,
  lng,
  draggable = false,
  onChange,
}: {
  lat: number;
  lng: number;
  draggable?: boolean;
  onChange?: (lat: number, lng: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const posRef = useRef({ lat, lng });
  onChangeRef.current = onChange;
  posRef.current = { lat, lng };

  useEffect(() => {
    let cancel = false;
    const node = host.current;
    if (!node) return;
    void import("leaflet").then((L) => {
      if (cancel || mapRef.current) return;
      const start = posRef.current;
      const map = L.map(node, { zoomControl: true }).setView([start.lat, start.lng], 15);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      const marker = L.marker([start.lat, start.lng], {
        draggable,
        icon: L.divIcon({
          className: "lamsa-pin",
          iconSize: [22, 22],
          iconAnchor: [11, 22],
        }),
      }).addTo(map);
      marker.on("dragend", () => {
        const point = marker.getLatLng();
        onChangeRef.current?.(point.lat, point.lng);
      });
      mapRef.current = map;
      markerRef.current = marker;
      window.setTimeout(() => map.invalidateSize(), 0);
    });
    return () => {
      cancel = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [draggable]);

  useEffect(() => {
    markerRef.current?.setLatLng([lat, lng]);
    mapRef.current?.panTo([lat, lng]);
  }, [lat, lng]);

  return (
    <div className="space-y-1">
      <div ref={host} className="h-56 w-full overflow-hidden rounded-xl border border-line" />
      <p className="text-xs text-muted">الخريطة © مساهمو OpenStreetMap</p>
    </div>
  );
}

export function DirectionsLink({ lat, lng }: { lat: number; lng: number }) {
  return (
    <a
      href={directionsUrl(lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-11 w-full items-center justify-center rounded-md border border-line bg-bg-elev text-sm font-medium"
    >
      اتجاهات
    </a>
  );
}
