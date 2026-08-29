import { useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const INTENSITY_COLOR = { high: "#FF6B5E", medium: "#F0A93E", low: "#2FD1B8" };
const INTENSITY_RADIUS = { high: 18, medium: 13, low: 9 };

const MAP_THEMES = {
  streets: {
    name: "City Streets",
    icon: "🗺️",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    overlayUrl: null,
    attribution: "Tiles &copy; Esri &mdash; Street Map",
    bg: "#f3f5f7",
  },
  dark: {
    name: "Dark Civic",
    icon: "🌙",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    overlayUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Dark Gray Canvas",
    bg: "#1b242e",
  },
  osm: {
    name: "OSM Standard",
    icon: "🌐",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    overlayUrl: null,
    attribution: "&copy; OpenStreetMap contributors",
    bg: "#ffffff",
  },
  hot: {
    name: "Civic Topo",
    icon: "🏛️",
    url: "https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    overlayUrl: null,
    attribution: "&copy; OpenStreetMap contributors, Humanitarian style",
    bg: "#f6f8fa",
  },
  satellite: {
    name: "Satellite Hybrid",
    icon: "🛰️",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    overlayUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; High-Res Satellite",
    bg: "#0b151e",
  },
};

export default function HotspotMap({ hotspots }) {
  const [activeTheme, setActiveTheme] = useState("streets");
  const theme = MAP_THEMES[activeTheme] || MAP_THEMES.streets;

  const center = hotspots?.length
    ? [hotspots[0].latitude, hotspots[0].longitude]
    : [17.4399, 78.4983];

  return (
    <div className="panel map-panel">
      <div className="panel-head map-panel-head">
        <div>
          <h3>Issue Density &amp; GIS Hotspots</h3>
          <span className="panel-sub mono">{hotspots?.length || 0} spatial clusters identified</span>
        </div>

        {/* Map Theme Toggle Switcher */}
        <div className="map-theme-bar">
          <span className="map-theme-label">Map Style:</span>
          <div className="map-theme-pill-group">
            {Object.entries(MAP_THEMES).map(([key, t]) => (
              <button
                key={key}
                type="button"
                className={`map-theme-btn ${activeTheme === key ? "active" : ""}`}
                onClick={() => setActiveTheme(key)}
                title={`Switch map theme to ${t.name}`}
              >
                <span className="theme-btn-icon">{t.icon}</span>
                <span className="theme-btn-text">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="map-wrapper-relative">
        {/* Prominent City Badge Overlay */}
        <div className="map-city-floating-pill">
          <span className="map-city-pin">📍</span>
          <span className="map-city-name">Hyderabad Municipal Region</span>
          <span className="map-city-state">Telangana</span>
        </div>

        <div className="map-inner" style={{ background: theme.bg }}>
          <MapContainer
            center={center}
            zoom={11}
            style={{ height: "100%", width: "100%", background: theme.bg }}
            scrollWheelZoom={false}
          >
            <TileLayer
              key={activeTheme}
              url={theme.url}
              attribution={theme.attribution}
            />
            {theme.overlayUrl && (
              <TileLayer
                key={`${activeTheme}-overlay`}
                url={theme.overlayUrl}
                zIndex={500}
              />
            )}
            {hotspots?.map((h, i) => (
              <CircleMarker
                key={i}
                center={[h.latitude, h.longitude]}
                radius={INTENSITY_RADIUS[h.intensity]}
                pathOptions={{
                  color: INTENSITY_COLOR[h.intensity],
                  fillColor: INTENSITY_COLOR[h.intensity],
                  fillOpacity: activeTheme === "satellite" ? 0.7 : 0.5,
                  weight: 2,
                }}
              >
                <Popup>
                  <div style={{ color: "#111", padding: "2px 4px" }}>
                    <strong style={{ textTransform: "capitalize", fontSize: "13px" }}>
                      {h.category?.replace(/_/g, " ")}
                    </strong>
                    <div style={{ marginTop: "4px", fontSize: "11.5px" }}>
                      {h.complaint_count} complaints · <span style={{ color: INTENSITY_COLOR[h.intensity], fontWeight: 700 }}>{h.intensity} intensity</span>
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#666", marginTop: "2px" }}>
                      Hyderabad Coordinates: {h.latitude?.toFixed(4)}, {h.longitude?.toFixed(4)}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="map-legend">
        <span><i style={{ background: INTENSITY_COLOR.high }} /> High Severity Cluster</span>
        <span><i style={{ background: INTENSITY_COLOR.medium }} /> Medium Cluster</span>
        <span><i style={{ background: INTENSITY_COLOR.low }} /> Low Density Alert</span>
      </div>
    </div>
  );
}
