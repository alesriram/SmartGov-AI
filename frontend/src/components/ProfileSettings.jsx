import { useState, useRef, useEffect } from "react";

const DEFAULT_WARD_OPTIONS = [
  "Bhadrachalam Ward 1 - Temple & Godavari Ghats Zone",
  "Bhadrachalam Ward 2 - Main Town & Bus Stand Zone",
  "Bhadrachalam Ward 3 - Bhupathirao Colony & Sub-Collector Zone",
  "Ward 12 - Jubilee Hills & Banjara Hills Zone",
  "Ward 1 - Begumpet & Secunderabad Zone",
  "Ward 3 - Hitec City & Madhapur Zone",
  "Ward 7 - Charminar & Old City Zone",
  "Ward 9 - Gachibowli & Financial District Zone",
  "Ward 15 - Kukatpally & Miyapur Zone",
  "Ward 18 - Mehdipatnam & Tolichowki Zone",
  "Khammam Municipal Corporation Zone",
  "Warangal Urban Corporation Zone",
];

const ROLE_OPTIONS = [
  "Municipal Officer / Admin",
  "Citizen Account",
  "Ward Supervisor",
  "Field Inspector",
  "Zonal Commissioner",
];

export default function ProfileSettings({ user, onSave, onBack }) {
  const initialWard = user?.ward || "Ward 12 - Jubilee Hills & Banjara Hills Zone";
  const [wardOptions, setWardOptions] = useState(() => {
    if (initialWard && !DEFAULT_WARD_OPTIONS.includes(initialWard)) {
      return [initialWard, ...DEFAULT_WARD_OPTIONS];
    }
    return DEFAULT_WARD_OPTIONS;
  });

  const [form, setForm] = useState({
    fullName: user?.fullName || "Demo Operator",
    email: user?.email || "demo@city.gov",
    phone: user?.phone || "+91 98765 43210",
    role: user?.role || "Municipal Officer / Admin",
    residentialAddress: user?.residentialAddress || "",
    ward: initialWard,
    avatarUrl: user?.avatarUrl || "",
  });

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        fullName: user.fullName || prev.fullName,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        role: user.role || prev.role,
        residentialAddress: user.residentialAddress !== undefined ? user.residentialAddress : prev.residentialAddress,
        ward: user.ward || prev.ward,
        avatarUrl: user.avatarUrl || prev.avatarUrl,
      }));
    }
  }, [user]);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locatingSuccess, setLocatingSuccess] = useState(false);
  const [locatingError, setLocatingError] = useState("");
  const fileInputRef = useRef(null);

  const getInitials = (name = "") => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "SG";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getWardTag = (wardStr = "") => {
    if (!wardStr) return "Ward 12";
    const match = wardStr.match(/(?:Ward\s+\d+|Bhadrachalam\s+Ward\s+\d+|Zone\s+\d+)/i);
    if (match) return match[0];
    const firstPart = wardStr.split("-")[0].trim();
    return firstPart.length > 16 ? firstPart.slice(0, 16) : firstPart;
  };

  const handleInputChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSavedSuccess(false);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setForm((prev) => ({ ...prev, avatarUrl: event.target.result }));
      setSavedSuccess(false);
    };
    reader.readAsDataURL(file);
  };

  const handleUseLocation = () => {
    setLocating(true);
    setLocatingSuccess(false);
    setLocatingError("");

    if (!("geolocation" in navigator)) {
      setLocating(false);
      setLocatingError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          // Query OpenStreetMap Nominatim reverse geocoding for exact address
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`,
            {
              headers: {
                "Accept-Language": "en",
              },
            }
          );

          if (!res.ok) throw new Error("Reverse geocoding network response failed");
          const data = await res.json();
          const addr = data.address || {};

          // Extract granular address components
          const landmarkOrName = data.name && data.name !== data.display_name ? data.name : "";
          const street = addr.road || addr.street || addr.neighbourhood || addr.suburb || addr.residential || "";
          const townOrCity = addr.town || addr.city || addr.municipality || addr.village || addr.county || "";
          const district = addr.state_district || "";
          const state = addr.state || "";
          const postcode = addr.postcode || "";

          // Compose readable, precise address
          const parts = [
            landmarkOrName,
            street,
            townOrCity,
            district && district !== townOrCity ? district : "",
            state,
            postcode,
          ].filter(Boolean);

          // Deduplicate consecutive identical names
          const cleanParts = parts.filter((item, index, self) => self.indexOf(item) === index);
          const fullAddress = cleanParts.length > 0
            ? cleanParts.join(", ")
            : data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

          // Determine appropriate Ward / Area Zone based on town or district
          let detectedWard = "";
          const foundWard = wardOptions.find((w) =>
            (townOrCity && w.toLowerCase().includes(townOrCity.toLowerCase())) ||
            (district && w.toLowerCase().includes(district.toLowerCase()))
          );

          if (foundWard) {
            detectedWard = foundWard;
          } else if (townOrCity) {
            detectedWard = `${townOrCity} - ${district || state} Municipal Zone`;
            setWardOptions((prev) => [detectedWard, ...prev]);
          }

          setForm((prev) => ({
            ...prev,
            residentialAddress: fullAddress,
            ...(detectedWard ? { ward: detectedWard } : {}),
          }));

          setLocatingSuccess(true);
          setTimeout(() => setLocatingSuccess(false), 4000);
        } catch (err) {
          console.error("Reverse geocoding error:", err);
          // Fallback to coordinates if network or rate limit fails
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setForm((prev) => ({
            ...prev,
            residentialAddress: `GPS Location: ${lat.toFixed(5)}, ${lon.toFixed(5)} (Telangana)`,
          }));
          setLocatingSuccess(true);
          setTimeout(() => setLocatingSuccess(false), 4000);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        let errorMsg = "Could not retrieve location. Please check browser location permissions.";
        if (err.code === 1) {
          errorMsg = "Location permission denied. Please allow location access in your browser address bar.";
        }
        setLocatingError(errorMsg);
        setTimeout(() => setLocatingError(""), 5000);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      onSave(form);
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    }, 300);
  };

  return (
    <div className="profile-settings-page">
      {/* Top Banner Card */}
      <div className="profile-banner-card">
        <div className="profile-banner-left">
          <div className="profile-shield-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div className="profile-banner-text">
            <h1 className="profile-banner-title">Profile &amp; Ward Settings</h1>
            <p className="profile-banner-sub">Manage your profile details and residential ward area.</p>
          </div>
        </div>

        <button type="button" className="btn-back-dashboard" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 10H5M11 16l-6-6 6-6" />
          </svg>
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Main Settings Card */}
      <div className="profile-main-card">
        <form onSubmit={handleSubmit}>
          {/* PROFILE PHOTO SECTION */}
          <div className="ps-section">
            <div className="ps-section-tag">PROFILE PHOTO</div>
            <div className="ps-avatar-row">
              <div className="ps-avatar-box">
                {form.avatarUrl ? (
                  <img src={form.avatarUrl} alt="Profile" className="ps-avatar-img" />
                ) : (
                  <span className="ps-avatar-initials">{getInitials(form.fullName)}</span>
                )}
                <button
                  type="button"
                  className="ps-camera-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload profile photo"
                  aria-label="Upload photo"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  style={{ display: "none" }}
                />
              </div>

              <div className="ps-avatar-details">
                <h2 className="ps-user-display-name">{form.fullName || "SmartGov Officer"}</h2>
                <p className="ps-user-upload-hint">Upload a photo for your account.</p>
                <div className="ps-badges-row">
                  <span className="ps-badge ps-badge-ward">{getWardTag(form.ward)}</span>
                  <span className="ps-badge ps-badge-role">{form.role || "Citizen Account"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CONTACT INFORMATION SECTION */}
          <div className="ps-section">
            <div className="ps-section-tag">CONTACT INFORMATION</div>
            <div className="ps-grid-2col">
              <div className="ps-field-group">
                <label className="ps-label" htmlFor="fullName">Full Name</label>
                <div className="ps-input-wrap">
                  <span className="ps-input-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    id="fullName"
                    type="text"
                    className="ps-input"
                    value={form.fullName}
                    onChange={handleInputChange("fullName")}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              <div className="ps-field-group">
                <label className="ps-label" htmlFor="email">Email Address</label>
                <div className="ps-input-wrap">
                  <span className="ps-input-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    className="ps-input"
                    value={form.email}
                    onChange={handleInputChange("email")}
                    placeholder="name@smartcity.gov"
                    required
                  />
                </div>
              </div>

              <div className="ps-field-group">
                <label className="ps-label" htmlFor="phone">Mobile Number</label>
                <div className="ps-input-wrap">
                  <span className="ps-input-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  <input
                    id="phone"
                    type="text"
                    className="ps-input"
                    value={form.phone}
                    onChange={handleInputChange("phone")}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="ps-field-group">
                <label className="ps-label" htmlFor="role">Account Role</label>
                <div className="ps-input-wrap">
                  <span className="ps-input-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </span>
                  <select
                    id="role"
                    className="ps-select"
                    value={form.role}
                    onChange={handleInputChange("role")}
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ADDRESS & AREA SECTION */}
          <div className="ps-section">
            <div className="ps-section-tag">ADDRESS &amp; AREA</div>

            <div className="ps-field-group">
              <div className="ps-label-row">
                <label className="ps-label" htmlFor="residentialAddress">Residential Address</label>
                <button
                  type="button"
                  className="ps-location-btn"
                  onClick={handleUseLocation}
                  disabled={locating}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                  </svg>
                  <span>{locating ? "Detecting GPS location..." : locatingSuccess ? "Location Updated ✓" : "Use my location"}</span>
                </button>
              </div>

              <div className="ps-input-wrap">
                <span className="ps-input-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <input
                  id="residentialAddress"
                  type="text"
                  className="ps-input"
                  value={form.residentialAddress}
                  onChange={handleInputChange("residentialAddress")}
                  placeholder="Enter your street / residential address"
                />
              </div>
              {locatingError ? (
                <p className="ps-loc-error">⚠️ {locatingError}</p>
              ) : (
                <p className="ps-hint-sub">Your submitted civic complaints will default to this residential address.</p>
              )}
            </div>

            <div className="ps-field-group" style={{ marginTop: "16px" }}>
              <label className="ps-label" htmlFor="wardSelect">Ward / Area Zone</label>
              <div className="ps-input-wrap">
                <span className="ps-input-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                </span>
                <select
                  id="wardSelect"
                  className="ps-select"
                  value={form.ward}
                  onChange={handleInputChange("ward")}
                >
                  {wardOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="ps-actions-bar">
            {savedSuccess && (
              <div className="ps-save-toast">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M5 10l3 3 7-7" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Profile &amp; Ward preferences saved successfully!</span>
              </div>
            )}
            <div className="ps-btn-row">
              <button
                type="button"
                className="btn-ghost"
                onClick={onBack}
              >
                Back to Dashboard
              </button>
              <button
                type="submit"
                className="btn-primary ps-save-btn"
                disabled={saving}
              >
                {saving ? "Saving Changes..." : "Save Profile & Ward"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
