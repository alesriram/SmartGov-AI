import { useEffect, useState } from "react";
import { api } from "./api";
import "./app.css";

import TopBar from "./components/TopBar";
import StatStrip from "./components/StatStrip";
import AgentPipeline from "./components/AgentPipeline";
import TrendChart from "./components/TrendChart";
import CategoryChart from "./components/CategoryChart";
import HotspotMap from "./components/HotspotMap";
import OperationalInsights from "./components/OperationalInsights";
import ForecastChart from "./components/ForecastChart";
import SLAPerformanceChart from "./components/SLAPerformanceChart";
import PeakHoursChart from "./components/PeakHoursChart";
import AIIntelligenceChart from "./components/AIIntelligenceChart";
import ComplaintHistory from "./components/ComplaintHistory";
import DepartmentPanel from "./components/DepartmentPanel";
import ReportForm from "./components/ReportForm";
import AIAgentConsole from "./components/AIAgentConsole";
import ProfileSettings from "./components/ProfileSettings";

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const DEMO_USER = {
  fullName: "Demo Operator",
  email: "demo@city.gov",
  phone: "+91 98765 43210",
  role: "Municipal Officer / Admin",
  residentialAddress: "",
  ward: "Ward 12 - Jubilee Hills & Banjara Hills Zone",
  password: "demo123",
  avatarUrl: "",
};

const normalizeEmail = (value = "") => value.trim().toLowerCase();

const validateRealisticEmail = (rawEmail = "") => {
  if (!rawEmail || typeof rawEmail !== "string") {
    return { valid: false, reason: "Email address is required." };
  }

  const email = rawEmail.trim().toLowerCase();

  // Basic RFC regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      reason: "Invalid email ID: Please enter a standard format (e.g. name@gmail.com).",
    };
  }

  const parts = email.split("@");
  if (parts.length !== 2) {
    return { valid: false, reason: "Invalid email ID: Must contain exactly one '@' symbol." };
  }

  const [username, domain] = parts;

  // Whitelisted system accounts
  if (email === "demo@city.gov") {
    return { valid: true };
  }

  // Check for fake / dummy placeholder words in email
  const fakeKeywords = [
    "fake", "dummy", "test", "testing", "temp", "trash", "sample",
    "burner", "throwaway", "nobody", "nothing", "spam", "spammer",
    "fakemail", "fakeemail", "noname", "invalid"
  ];
  if (fakeKeywords.some((kw) => username.includes(kw) || domain.includes(kw))) {
    return {
      valid: false,
      reason: `The email '${rawEmail}' contains fake or placeholder words. SmartGov AI requires an active, authentic email address.`,
    };
  }

  // Domain structure checks
  if (!domain.includes(".")) {
    return { valid: false, reason: "Invalid email domain: Missing domain extension (.com, .org, etc.)." };
  }

  const domainParts = domain.split(".");
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2 || tld.length > 12 || /\d/.test(tld)) {
    return { valid: false, reason: `Invalid email domain extension ('.${tld}').` };
  }

  // Block disposable / throwaway / placeholder domains
  const blockedDomains = [
    "mailinator.com", "tempmail.com", "10minutemail.com", "throwawaymail.com",
    "guerrillamail.com", "fake.com", "test.com", "example.com", "asdf.com",
    "trashmail.com", "yopmail.com", "burnermail.com", "fakemail.net", "fake.org",
    "xyz.com", "abc.com", "random.com", "none.com", "sample.org"
  ];
  if (blockedDomains.includes(domain)) {
    return {
      valid: false,
      reason: `The domain '@${domain}' is not a recognized active email provider. Please enter your real email.`,
    };
  }

  // Validate recognized active providers
  const popularProviders = [
    "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "outlook.com",
    "hotmail.com", "live.com", "msn.com", "icloud.com", "me.com", "mac.com",
    "proton.me", "protonmail.com", "zoho.com", "aol.com", "mail.com", "gmx.com",
    "yandex.com", "rediffmail.com"
  ];
  const isGovernmentOrEdu =
    domain.endsWith(".gov") || domain.endsWith(".gov.in") ||
    domain.endsWith(".nic.in") || domain.endsWith(".edu") ||
    domain.endsWith(".ac.in") || domain.endsWith(".org") ||
    domain.endsWith(".mil");
  const isCorporateOrPopular =
    popularProviders.includes(domain) ||
    (domainParts.length >= 2 && domainParts[0].length >= 3 && ["com", "in", "co", "io", "ai", "net", "org"].includes(tld));

  if (!popularProviders.includes(domain) && !isGovernmentOrEdu && !isCorporateOrPopular) {
    return {
      valid: false,
      reason: `The domain '@${domain}' could not be verified as an active, legitimate email provider.`,
    };
  }

  // Username minimum length
  if (username.length < 3) {
    return { valid: false, reason: "Invalid email ID: Username must be at least 3 characters." };
  }

  // Check for sequential keyboard mashing rows: e.g. 'asdf', 'qwer', 'zxcv'
  const mashingRows = ["asdf", "qwer", "zxcv", "hjkl", "jklm", "1234", "5678", "abcd"];
  if (mashingRows.some((p) => username.includes(p))) {
    return {
      valid: false,
      reason: "Invalid email ID: Looks like random keyboard input. Please enter your genuine email.",
    };
  }

  // Extract letters only from username
  const lettersOnly = username.replace(/[^a-z]/g, "");

  // Vowel check for consonant mashing: e.g. "kjfkjs"
  // Genuine names/emails with 4+ letters contain at least one vowel (a, e, i, o, u, y)
  if (lettersOnly.length >= 4 && !/[aeiouy]/.test(lettersOnly)) {
    return {
      valid: false,
      reason: `The email address '${rawEmail}' appears to be fake or randomly generated (no vowels detected in '${username}'). Please enter an authentic, verified email address.`,
    };
  }

  // Check for 5 or more consecutive consonants in a row (e.g. "bcdfgh")
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/.test(username)) {
    return {
      valid: false,
      reason: `Invalid email ID: Too many consecutive consonants in '${username}'. Please enter a real name or email handle.`,
    };
  }

  // Check for repeated identical characters: e.g. 'aaaaa@gmail.com'
  if (/^(.)\1{3,}$/.test(username)) {
    return { valid: false, reason: "Invalid email ID: Repeated identical characters detected." };
  }

  return { valid: true };
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("smartgov-current-user");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed.email === "commissioner.sharma@smartcity.gov" ||
          parsed.fullName === "Dr. Rajesh V. Sharma"
        ) {
          localStorage.setItem("smartgov-current-user", JSON.stringify(DEMO_USER));
          return DEMO_USER;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const saved = localStorage.getItem("smartgov-current-user");
      return !!saved;
    } catch {
      return false;
    }
  });
  const [view, setView] = useState(() => {
    try {
      const hash = window.location.hash.replace("#", "").trim();
      const validViews = ["overview", "history", "report", "copilot", "profile"];
      if (hash && validViews.includes(hash)) {
        return hash;
      }
      const savedView = localStorage.getItem("smartgov-current-view");
      return savedView || "overview";
    } catch {
      return "overview";
    }
  });
  const [invalidEmailModal, setInvalidEmailModal] = useState({ open: false, email: "", reason: "" });
  const [otpVerificationState, setOtpVerificationState] = useState({
    open: false,
    email: "",
    fullName: "",
    password: "",
    generatedCode: "",
    inputCode: "",
    error: "",
    successMsg: "",
  });

  // Native browser back arrow (←) and forward arrow (→) integration via popstate
  useEffect(() => {
    const validViews = ["overview", "history", "report", "copilot", "profile"];

    // Initialize browser history entry so the native back button knows the entry point
    const currentHash = window.location.hash.replace("#", "").trim();
    const activeInitialView = validViews.includes(currentHash) ? currentHash : "overview";
    window.history.replaceState({ view: activeInitialView }, "", `#${activeInitialView}`);

    const handlePopState = (event) => {
      const stateView = event.state?.view;
      const hashView = window.location.hash.replace("#", "").trim();
      const targetView = stateView || (validViews.includes(hashView) ? hashView : "overview");

      if (validViews.includes(targetView)) {
        setView(targetView);
        try {
          localStorage.setItem("smartgov-current-view", targetView);
        } catch {}
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateView = (nextView) => {
    if (nextView === view) return;
    // Push new view to native browser history: clicking browser's left arrow navigates back!
    window.history.pushState({ view: nextView }, "", `#${nextView}`);
    setView(nextView);
    try {
      localStorage.setItem("smartgov-current-view", nextView);
    } catch {}
  };
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      const val = localStorage.getItem("smartgov-remember-me");
      return val !== "false";
    } catch {
      return true;
    }
  });
  const [savedCredentials, setSavedCredentials] = useState(() => {
    try {
      const saved = localStorage.getItem("smartgov-saved-credentials");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed.email === "commissioner.sharma@smartcity.gov" ||
          parsed.fullName === "Dr. Rajesh V. Sharma"
        ) {
          localStorage.removeItem("smartgov-saved-credentials");
          return null;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [authMode, setAuthMode] = useState("signin");
  const [authForm, setAuthForm] = useState(() => {
    try {
      const saved = localStorage.getItem("smartgov-saved-credentials");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          fullName: parsed.fullName || "",
          email: parsed.email || "",
          password: parsed.password || "",
          confirmPassword: "",
        };
      }
    } catch {}
    return emptyForm;
  });
  const [authError, setAuthError] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState(() => {
    try {
      const saved = localStorage.getItem("smartgov-registered-users");
      const list = saved ? JSON.parse(saved) : [];
      return list.filter(
        (u) =>
          normalizeEmail(u.email) !== "commissioner.sharma@smartcity.gov" &&
          u.fullName !== "Dr. Rajesh V. Sharma"
      );
    } catch {
      return [];
    }
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState("");
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [commandCenterTab, setCommandCenterTab] = useState("executive");
  const [selectedId, setSelectedId] = useState(null);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const loadAll = async () => {
    try {
      const [s, t, h, c, d, f] = await Promise.all([
        api.stats(),
        api.trends(),
        api.hotspots(),
        api.complaints({ limit: 100 }),
        api.departments(),
        api.forecast(7).catch(() => null),
      ]);
      setStats(s);
      setTrends(t);
      setHotspots(h);
      setComplaints(c);
      setDepartments(d);
      if (f) setForecast(f);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  };

  useEffect(() => {
    localStorage.setItem("smartgov-registered-users", JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("smartgov-current-user", JSON.stringify(currentUser));
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem("smartgov-current-user");
      setIsAuthenticated(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (view) {
      localStorage.setItem("smartgov-current-view", view);
    }
  }, [view]);

  useEffect(() => {
    if (!isAuthenticated) return;

    loadAll();
    const interval = setInterval(loadAll, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleSelectComplaint = async (id) => {
    setSelectedId(id);
    const detail = await api.complaint(id);
    setSelectedTrace(detail.agent_trace);
  };

  const handleSubmitted = () => {
    loadAll();
    setView("history");
  };

  const handleDeleteComplaint = async (id) => {
    try {
      await api.deleteComplaint(id);
      setComplaints((prev) => prev.filter((c) => c.id !== id));
      loadAll();
    } catch (err) {
      console.error("Failed to delete complaint:", err);
    }
  };

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
    setAuthError("");
  };

  const handleAuthSubmit = (event) => {
    event.preventDefault();

    const email = normalizeEmail(authForm.email);
    const password = authForm.password.trim();

    if (authMode === "signup" && !authForm.fullName.trim()) {
      setAuthError("Please enter your full name.");
      return;
    }

    if (!email || !password) {
      setAuthError("Email and password are required.");
      return;
    }

    // Validate email authenticity (reject fake/burner emails like kjfkjs@gmail.com)
    const emailCheck = validateRealisticEmail(email);
    if (!emailCheck.valid) {
      setInvalidEmailModal({
        open: true,
        email: email || authForm.email,
        reason: emailCheck.reason,
      });
      setAuthError(emailCheck.reason);
      return;
    }

    if (authMode === "signup") {
      if (authForm.password !== authForm.confirmPassword) {
        setAuthError("Passwords do not match.");
        return;
      }

      if (authForm.password.length < 4) {
        setAuthError("Password must be at least 4 characters.");
        return;
      }

      const alreadyRegistered = registeredUsers.some(
        (user) => normalizeEmail(user.email) === email
      );

      if (alreadyRegistered) {
        setAuthMode("signin");
        setAuthForm((current) => ({ ...current, email, password: "", confirmPassword: "" }));
        setAuthError("This email is already registered and verified. Please sign in.");
        return;
      }

      // Generate a secure 6-digit OTP verification code for real email activation
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setOtpVerificationState({
        open: true,
        email: email,
        fullName: authForm.fullName.trim(),
        password: authForm.password,
        generatedCode: otp,
        inputCode: "",
        error: "",
        successMsg: "",
      });
      return;
    }

    const demoMatch = email === normalizeEmail(DEMO_USER.email) && password === DEMO_USER.password;
    const matchedUser = registeredUsers.find(
      (user) => normalizeEmail(user.email) === email && user.password === password
    );

    if (demoMatch || matchedUser) {
      const loggedUser = demoMatch ? DEMO_USER : matchedUser;
      if (rememberMe) {
        localStorage.setItem("smartgov-remember-me", "true");
        localStorage.setItem("smartgov-saved-credentials", JSON.stringify(loggedUser));
        setSavedCredentials(loggedUser);
      } else {
        localStorage.setItem("smartgov-remember-me", "false");
        localStorage.removeItem("smartgov-saved-credentials");
        setSavedCredentials(null);
      }
      setCurrentUser(loggedUser);
      setIsAuthenticated(true);
      setAuthError("");
      return;
    }

    // Check if user exists with wrong password
    const userExistsWrongPass = registeredUsers.some(
      (user) => normalizeEmail(user.email) === email
    );

    if (userExistsWrongPass) {
      setAuthError("Incorrect password for this registered account. Please try again.");
      return;
    }

    // Not registered or unverified account
    setInvalidEmailModal({
      open: true,
      email,
      reason: `No verified active account found for '${email}'. SmartGov AI requires an authentic, verified account. Please click 'Create an account' to register and verify your email.`,
    });
    setAuthError(`No verified account found for ${email}. Please register and verify your account first.`);
  };

  const handleVerifyOtp = (e) => {
    e?.preventDefault();
    if (otpVerificationState.inputCode.trim() !== otpVerificationState.generatedCode) {
      setOtpVerificationState((prev) => ({
        ...prev,
        error: "Incorrect verification code. Please enter the 6-digit code sent to your email.",
      }));
      return;
    }

    // Code matches! Activate verified user
    const nextUser = {
      fullName: otpVerificationState.fullName,
      email: otpVerificationState.email,
      password: otpVerificationState.password,
      role: "Verified Citizen Account",
      isEmailVerified: true,
      verifiedAt: new Date().toISOString(),
    };

    setRegisteredUsers((current) => {
      const alreadyExists = current.some((user) => normalizeEmail(user.email) === nextUser.email);
      if (alreadyExists) {
        return current.map((user) => normalizeEmail(user.email) === nextUser.email ? nextUser : user);
      }
      return [...current, nextUser];
    });

    if (rememberMe) {
      localStorage.setItem("smartgov-remember-me", "true");
      localStorage.setItem("smartgov-saved-credentials", JSON.stringify(nextUser));
      setSavedCredentials(nextUser);
    }

    setCurrentUser(nextUser);
    setAuthError("");
    setIsAuthenticated(true);
    setOtpVerificationState({
      open: false,
      email: "",
      fullName: "",
      password: "",
      generatedCode: "",
      inputCode: "",
      error: "",
      successMsg: "",
    });
  };

  const handleResendOtp = () => {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpVerificationState((prev) => ({
      ...prev,
      generatedCode: newOtp,
      inputCode: "",
      error: "",
      successMsg: "New 6-digit verification code has been dispatched to your email!",
    }));
  };

  const handleFastLogin = () => {
    if (!savedCredentials) return;
    const email = normalizeEmail(savedCredentials.email);
    const password = savedCredentials.password;

    const emailCheck = validateRealisticEmail(email);
    if (!emailCheck.valid) {
      setInvalidEmailModal({
        open: true,
        email,
        reason: emailCheck.reason,
      });
      setAuthError(emailCheck.reason);
      return;
    }

    const demoMatch = email === normalizeEmail(DEMO_USER.email) && password === DEMO_USER.password;
    const matchedUser = registeredUsers.find(
      (user) => normalizeEmail(user.email) === email && user.password === password
    );

    if (demoMatch || matchedUser) {
      const loggedUser = demoMatch ? DEMO_USER : matchedUser;
      setCurrentUser(loggedUser);
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthForm({
        fullName: savedCredentials.fullName || "",
        email: savedCredentials.email || "",
        password: savedCredentials.password || "",
        confirmPassword: "",
      });
      setAuthError("Account details recognized. Click Login below to sign in.");
    }
  };

  const openProfile = () => {
    navigateView("profile");
    setProfileOpen(false);
  };

  const handleSaveProfile = (updatedProfile) => {
    if (!currentUser) return;

    const nextUser = {
      ...currentUser,
      ...updatedProfile,
      fullName: updatedProfile.fullName?.trim() || currentUser.fullName,
      email: normalizeEmail(updatedProfile.email) || currentUser.email,
    };

    setCurrentUser(nextUser);
    setRegisteredUsers((users) => {
      const exists = users.some(
        (u) => normalizeEmail(u.email) === normalizeEmail(currentUser.email)
      );
      if (exists) {
        return users.map((u) =>
          normalizeEmail(u.email) === normalizeEmail(currentUser.email) ? nextUser : u
        );
      }
      return [...users, nextUser];
    });

    if (rememberMe) {
      localStorage.setItem("smartgov-saved-credentials", JSON.stringify(nextUser));
      setSavedCredentials(nextUser);
    }
  };

  const handlePerformGoogleLogin = (targetEmail, targetName) => {
    const email = normalizeEmail(targetEmail || authForm.email || "alesaisriramkumar@gmail.com");

    // Validate email authenticity (reject fake/burner emails like kjfkjs@gmail.com)
    const emailCheck = validateRealisticEmail(email);
    if (!emailCheck.valid) {
      setInvalidEmailModal({
        open: true,
        email,
        reason: emailCheck.reason,
      });
      setAuthError(emailCheck.reason);
      return;
    }

    // Check if this user already exists in registered users
    const existing = registeredUsers.find((u) => normalizeEmail(u.email) === email);

    let fullName = targetName || authForm.fullName?.trim();
    if (!fullName) {
      if (existing?.fullName) {
        fullName = existing.fullName;
      } else if (email.includes("alesai") || email.includes("sriram")) {
        fullName = "Sri";
      } else {
        const prefix = email.split("@")[0].replace(/[._0-9]/g, " ").trim();
        fullName = prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : "Citizen User";
      }
    }

    const googleUser = existing
      ? { ...existing, fullName: existing.fullName || fullName }
      : {
          fullName: fullName,
          email: email,
          phone: "+91 98765 43210",
          role: "Citizen Account",
          residentialAddress: "",
          ward: "Ward 12 - Jubilee Hills & Banjara Hills Zone",
          password: "google_oauth_auth",
          avatarUrl: "",
        };

    setCurrentUser(googleUser);
    setRegisteredUsers((current) => {
      const filtered = current.filter(
        (u) =>
          normalizeEmail(u.email) !== "commissioner.sharma@smartcity.gov" &&
          u.fullName !== "Dr. Rajesh V. Sharma"
      );
      const exists = filtered.some((u) => normalizeEmail(u.email) === email);
      return exists
        ? filtered.map((u) => (normalizeEmail(u.email) === email ? googleUser : u))
        : [...filtered, googleUser];
    });

    if (rememberMe) {
      localStorage.setItem("smartgov-remember-me", "true");
      localStorage.setItem("smartgov-saved-credentials", JSON.stringify(googleUser));
      setSavedCredentials(googleUser);
    }
    setAuthError("");
    setGoogleModalOpen(false);
    setIsAuthenticated(true);
  };

  const handleGoogleSignIn = () => {
    // If the user already typed an email into the input (e.g. alesaisriramkumar@gmail.com), sign in directly
    if (authForm.email && authForm.email.trim()) {
      handlePerformGoogleLogin(authForm.email.trim(), authForm.fullName);
    } else {
      setGoogleModalOpen(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    try {
      localStorage.removeItem("smartgov-current-user");
      localStorage.removeItem("smartgov-current-view");
    } catch {}
    setView("overview");
    setAuthMode("signin");
    setAuthForm(emptyForm);
    setAuthError("");
    setProfileOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-page-root">
        <div className="auth-split-layout">
          {/* Left Column: AI Municipal Intelligence Platform Hero */}
          <div className="auth-hero-col">
            <div className="auth-brand-badge">
              <span className="auth-brand-dot" />
              <span className="auth-brand-title">SmartGov AI</span>
              <span className="auth-brand-version">v2.4</span>
            </div>

            <div className="auth-hero-content">
              <span className="auth-platform-tag">AI MUNICIPAL INTELLIGENCE &amp; OPERATIONS</span>
              <h1 className="auth-hero-title">
                Empowering<br />
                Smarter Cities,<br />
                Resolving Faster.
              </h1>
              <p className="auth-hero-desc">
                Autonomous 4-agent grievance triage, real-time Computer Vision inspection, and predictive GIS dispatch for modern urban governance.
              </p>

              <div className="auth-hero-pills">
                <span className="auth-hero-pill">⚡ Real-Time CV Pothole &amp; Garbage Detection</span>
                <span className="auth-hero-pill">🤖 4-Agent Autonomous Routing &amp; SLA Triage</span>
                <span className="auth-hero-pill">📍 Predictive GIS Hotspots &amp; Automated Dispatch</span>
              </div>
            </div>
          </div>

          {/* Right Column: Secure Access Form Card */}
          <div className="auth-card-col">
            <div className="auth-card-container">
              <div className="auth-card-top-tag">SECURE ACCESS</div>
              <h2 className="auth-card-heading">
                {authMode === "signin" ? "Welcome back" : "Create an account"}
              </h2>
              <p className="auth-card-subheading">
                {authMode === "signin"
                  ? "Sign in to access your municipal operations desk."
                  : "Register your account to access civic operations."}
              </p>

              {authMode === "signin" && savedCredentials?.email && (
                <div className="auth-recognized-pill">
                  <div className="auth-rec-info">
                    <span className="auth-rec-tag">⚡ RECOGNIZED</span>
                    <span className="auth-rec-name">{savedCredentials.fullName || "Citizen"}</span>
                  </div>
                  <button
                    type="button"
                    className="auth-rec-btn"
                    onClick={handleFastLogin}
                  >
                    1-Click In →
                  </button>
                </div>
              )}

              <form className="auth-main-form" onSubmit={handleAuthSubmit}>
                {authMode === "signup" && (
                  <div className="auth-field-group">
                    <label className="auth-label">Full name</label>
                    <input
                      type="text"
                      name="fullName"
                      className="auth-input"
                      value={authForm.fullName}
                      onChange={handleAuthChange}
                      placeholder="e.g. Alex Morgan"
                      required
                    />
                  </div>
                )}

                <div className="auth-field-group">
                  <label className="auth-label">Email address</label>
                  <input
                    type="email"
                    name="email"
                    className="auth-input"
                    value={authForm.email}
                    onChange={handleAuthChange}
                    placeholder="citizen@example.com"
                    required
                  />
                </div>

                <div className="auth-field-group">
                  <label className="auth-label">Password</label>
                  <input
                    type="password"
                    name="password"
                    className="auth-input"
                    value={authForm.password}
                    onChange={handleAuthChange}
                    placeholder="Enter your password"
                    required
                  />
                </div>

                {authMode === "signup" && (
                  <div className="auth-field-group">
                    <label className="auth-label">Confirm password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      className="auth-input"
                      value={authForm.confirmPassword}
                      onChange={handleAuthChange}
                      placeholder="Re-enter your password"
                      required
                    />
                  </div>
                )}

                <div className="auth-remember-row">
                  <label className="auth-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setRememberMe(checked);
                        if (!checked) {
                          localStorage.setItem("smartgov-remember-me", "false");
                          localStorage.removeItem("smartgov-saved-credentials");
                          setSavedCredentials(null);
                        } else {
                          localStorage.setItem("smartgov-remember-me", "true");
                          if (authForm.email && authForm.password) {
                            const creds = { fullName: authForm.fullName, email: authForm.email, password: authForm.password };
                            localStorage.setItem("smartgov-saved-credentials", JSON.stringify(creds));
                            setSavedCredentials(creds);
                          }
                        }
                      }}
                      className="auth-checkbox"
                    />
                    <span>Remember me</span>
                  </label>

                  {authMode === "signin" && (
                    <button
                      type="button"
                      className="auth-forgot-btn"
                      onClick={() => {
                        const email = normalizeEmail(authForm.email);
                        if (!email) {
                          setAuthError("Please enter your email above first.");
                          return;
                        }
                        const found = registeredUsers.find((u) => normalizeEmail(u.email) === email);
                        if (found) {
                          alert(`Account found for ${found.fullName || email}!\nYour password is: ${found.password}`);
                          setAuthForm((f) => ({ ...f, password: found.password }));
                        } else if (email === normalizeEmail(DEMO_USER.email)) {
                          alert(`Demo Operator password is: ${DEMO_USER.password}`);
                          setAuthForm((f) => ({ ...f, password: DEMO_USER.password }));
                        } else {
                          setAuthError("No account found for this email. Please switch to Sign Up.");
                        }
                      }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                {authError && <div className="auth-error-box">{authError}</div>}

                <button type="submit" className="auth-primary-submit-btn">
                  {authMode === "signin" ? "Sign in" : "Create an account"}
                </button>

                <div className="auth-divider">
                  <span>or with Google</span>
                </div>

                <button
                  type="button"
                  className="auth-google-btn"
                  onClick={handleGoogleSignIn}
                >
                  <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </button>

                <button
                  type="button"
                  className="auth-demo-alt-btn"
                  onClick={() => {
                    setCurrentUser(DEMO_USER);
                    setRegisteredUsers((current) => {
                      const filtered = current.filter(
                        (u) =>
                          normalizeEmail(u.email) !== "commissioner.sharma@smartcity.gov" &&
                          u.fullName !== "Dr. Rajesh V. Sharma"
                      );
                      const hasDemo = filtered.some((user) => normalizeEmail(user.email) === normalizeEmail(DEMO_USER.email));
                      return hasDemo ? filtered : [...filtered, DEMO_USER];
                    });
                    if (rememberMe) {
                      localStorage.setItem("smartgov-saved-credentials", JSON.stringify(DEMO_USER));
                      setSavedCredentials(DEMO_USER);
                    }
                    setAuthError("");
                    setIsAuthenticated(true);
                  }}
                >
                  Continue as Demo Operator
                </button>
              </form>

              <div className="auth-toggle-footer">
                {authMode === "signin" ? (
                  <p>
                    New citizen?{" "}
                    <button
                      type="button"
                      className="auth-switch-btn"
                      onClick={() => {
                        setAuthMode("signup");
                        setAuthError("");
                      }}
                    >
                      Create an account
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="auth-switch-btn"
                      onClick={() => {
                        setAuthMode("signin");
                        setAuthError("");
                      }}
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Email OTP Verification Modal */}
        {otpVerificationState.open && (
          <div className="google-modal-backdrop" onClick={() => setOtpVerificationState((prev) => ({ ...prev, open: false }))}>
            <div className="otp-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="otp-icon-wrap">
                <span>🛡️</span>
              </div>
              <h3 className="otp-modal-title">Verify Active Citizen Email</h3>
              <p className="otp-modal-desc">
                SmartGov AI requires real, verified email addresses to prevent fraudulent complaints and deliver official grievance receipts:
              </p>
              <div className="otp-target-email-badge">
                <span>✉️ {otpVerificationState.email}</span>
                <span className="otp-live-tag">Verification Pending</span>
              </div>

              {/* Simulated Mailbox Dispatch Alert with Instant Autofill */}
              <div className="otp-dispatch-toast">
                <div className="otp-dispatch-header">
                  <span className="pulse-circle" />
                  <strong>Security Code Dispatched to Inbox</strong>
                </div>
                <p>One-Time Password: <strong className="otp-code-highlight">{otpVerificationState.generatedCode}</strong></p>
                <button
                  type="button"
                  className="otp-autofill-btn"
                  onClick={() => {
                    setOtpVerificationState((prev) => ({
                      ...prev,
                      inputCode: prev.generatedCode,
                      error: "",
                    }));
                  }}
                >
                  ⚡ Auto-Fill Code
                </button>
              </div>

              <form onSubmit={handleVerifyOtp} className="otp-form">
                <label className="otp-input-label">Enter 6-Digit Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpVerificationState.inputCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setOtpVerificationState((prev) => ({ ...prev, inputCode: val, error: "" }));
                  }}
                  placeholder="• • • • • •"
                  className="otp-code-input mono"
                  autoFocus
                  required
                />

                {otpVerificationState.error && (
                  <div className="otp-error-banner">⚠️ {otpVerificationState.error}</div>
                )}
                {otpVerificationState.successMsg && (
                  <div className="otp-success-banner">✓ {otpVerificationState.successMsg}</div>
                )}

                <div className="otp-actions-col">
                  <button
                    type="submit"
                    className="btn-primary otp-verify-submit-btn"
                    disabled={otpVerificationState.inputCode.length < 6}
                  >
                    Verify &amp; Activate Account →
                  </button>

                  <div className="otp-resend-row">
                    <button
                      type="button"
                      className="otp-resend-btn"
                      onClick={handleResendOtp}
                    >
                      Resend Verification Code
                    </button>
                    <span className="dot-sep">•</span>
                    <button
                      type="button"
                      className="otp-cancel-btn"
                      onClick={() => setOtpVerificationState((prev) => ({ ...prev, open: false }))}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invalid Email Alert Popup Modal */}
        {invalidEmailModal.open && (
          <div className="google-modal-backdrop" onClick={() => setInvalidEmailModal({ open: false, email: "", reason: "" })}>
            <div className="invalid-email-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="invalid-email-icon-wrap">
                <span>⚠️</span>
              </div>
              <h3 className="invalid-email-title">Invalid Email Address</h3>
              <p className="invalid-email-badge-email">{invalidEmailModal.email}</p>
              <p className="invalid-email-desc">
                {invalidEmailModal.reason || "The email entered appears to be invalid or randomly typed. SmartGov AI requires an authentic, verified email address to send civic grievance receipts, status notifications, and OTP verification."}
              </p>
              <div className="invalid-email-actions">
                <button
                  type="button"
                  className="btn-primary invalid-email-ok-btn"
                  onClick={() => setInvalidEmailModal({ open: false, email: "", reason: "" })}
                >
                  Okay, Let Me Correct It
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Google Account Selector Dialog */}
        {googleModalOpen && (
          <div className="google-modal-backdrop" onClick={() => setGoogleModalOpen(false)}>
            <div className="google-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="google-modal-header">
                <svg viewBox="0 0 24 24" width="30" height="30">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <h3>Sign in with Google</h3>
                <p>Choose an account to continue to SmartGov AI</p>
              </div>

              <div className="google-account-list">
                <button
                  type="button"
                  className="google-account-item"
                  onClick={() => handlePerformGoogleLogin("alesaisriramkumar@gmail.com", "Sri")}
                >
                  <div className="google-acc-avatar">S</div>
                  <div className="google-acc-details">
                    <span className="google-acc-name">Sri</span>
                    <span className="google-acc-email">alesaisriramkumar@gmail.com</span>
                  </div>
                </button>
              </div>

              <div className="google-custom-divider">
                <span>or enter another Google account</span>
              </div>

              <div className="google-custom-row">
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  value={googleCustomEmail}
                  onChange={(e) => setGoogleCustomEmail(e.target.value)}
                  className="google-custom-input"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && googleCustomEmail.trim()) {
                      handlePerformGoogleLogin(googleCustomEmail.trim());
                    }
                  }}
                />
                <button
                  type="button"
                  className="google-custom-submit-btn"
                  onClick={() => {
                    if (googleCustomEmail.trim()) {
                      const check = validateRealisticEmail(googleCustomEmail.trim());
                      if (!check.valid) {
                        setGoogleModalOpen(false);
                        setInvalidEmailModal({
                          open: true,
                          email: googleCustomEmail.trim(),
                          reason: check.reason,
                        });
                        return;
                      }
                      const namePart = googleCustomEmail.split("@")[0];
                      const capitalized = namePart.charAt(0).toUpperCase() + namePart.slice(1);
                      selectGoogleAccount(capitalized, googleCustomEmail.trim());
                    }
                  }}
                >
                  Sign In with this Google Account →
                </button>
              </div>

              <button
                type="button"
                className="google-modal-cancel-btn"
                onClick={() => setGoogleModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`app-shell${sidebarOpen ? " sidebar-open" : ""}`}>
      <TopBar
        view={view}
        setView={navigateView}
        user={currentUser}
        onOpenProfile={openProfile}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <div className="main-panel">
        {loadError && (
          <div className="banner-error">
            Can't reach the backend API. Start it with{" "}
            <code>uvicorn main:app --reload</code> in the <code>backend/</code> folder.
          </div>
        )}

        {view === "overview" && (
          <main className="dashboard-grid">
            <StatStrip stats={stats} />

            {/* Structured Intelligence Lens Switcher */}
            <div className="cc-lens-container">
              <div className="cc-lens-left">
                <span className="cc-lens-label">INTELLIGENCE LENS:</span>
                <div className="cc-lens-pill-group">
                  <button
                    type="button"
                    className={`cc-lens-btn ${commandCenterTab === "executive" ? "active" : ""}`}
                    onClick={() => setCommandCenterTab("executive")}
                  >
                    <span className="lens-btn-icon">📊</span>
                    <span>Executive Overview</span>
                  </button>

                  <button
                    type="button"
                    className={`cc-lens-btn ${commandCenterTab === "predictive" ? "active" : ""}`}
                    onClick={() => setCommandCenterTab("predictive")}
                  >
                    <span className="lens-btn-icon">🔮</span>
                    <span>Predictive &amp; SLA Insights</span>
                  </button>

                  <button
                    type="button"
                    className={`cc-lens-btn ${commandCenterTab === "telemetry" ? "active" : ""}`}
                    onClick={() => setCommandCenterTab("telemetry")}
                  >
                    <span className="lens-btn-icon">🤖</span>
                    <span>AI Agent Telemetry</span>
                  </button>

                  <button
                    type="button"
                    className={`cc-lens-btn ${commandCenterTab === "all" ? "active" : ""}`}
                    onClick={() => setCommandCenterTab("all")}
                  >
                    <span className="lens-btn-icon">⚡</span>
                    <span>All Intelligence Modules</span>
                  </button>
                </div>
              </div>

              <div className="cc-lens-right mono">
                <span className="cc-live-badge">
                  <span className="cc-pulse-dot" />
                  Live Sync
                </span>
              </div>
            </div>

            {/* 1. Executive Overview Lens */}
            {commandCenterTab === "executive" && (
              <>
                <AgentPipeline
                  trace={selectedTrace}
                  complaintLabel={selectedId}
                />

                <div className="grid-row grid-row-3">
                  <TrendChart trends={trends} />
                  <CategoryChart breakdown={stats?.category_breakdown} />
                  <DepartmentPanel departments={departments} />
                </div>

                <div className="grid-row grid-row-2">
                  <HotspotMap hotspots={hotspots} />
                  <OperationalInsights
                    stats={stats}
                    complaints={complaints}
                    departments={departments}
                    onNavigateHistory={() => navigateView("history")}
                  />
                </div>
              </>
            )}

            {/* 2. Predictive & SLA Insights Lens */}
            {commandCenterTab === "predictive" && (
              <>
                <div className="grid-row grid-row-2">
                  <ForecastChart
                    forecastData={forecast}
                    complaints={complaints}
                  />
                  <SLAPerformanceChart
                    departments={departments}
                    stats={stats}
                  />
                </div>

                <div className="grid-row grid-row-2">
                  <PeakHoursChart complaints={complaints} />
                  <HotspotMap hotspots={hotspots} />
                </div>
              </>
            )}

            {/* 3. AI Agent Telemetry Lens */}
            {commandCenterTab === "telemetry" && (
              <>
                <AgentPipeline
                  trace={selectedTrace}
                  complaintLabel={selectedId}
                />

                <div className="grid-row grid-row-2">
                  <AIIntelligenceChart
                    complaints={complaints}
                    stats={stats}
                  />
                  <OperationalInsights
                    stats={stats}
                    complaints={complaints}
                    departments={departments}
                    onNavigateHistory={() => navigateView("history")}
                  />
                </div>

                <div className="grid-row grid-row-2">
                  <SLAPerformanceChart
                    departments={departments}
                    stats={stats}
                  />
                  <PeakHoursChart complaints={complaints} />
                </div>
              </>
            )}

            {/* 4. All Intelligence Modules View */}
            {commandCenterTab === "all" && (
              <>
                <AgentPipeline
                  trace={selectedTrace}
                  complaintLabel={selectedId}
                />

                <div className="grid-row grid-row-3">
                  <TrendChart trends={trends} />
                  <CategoryChart breakdown={stats?.category_breakdown} />
                  <DepartmentPanel departments={departments} />
                </div>

                <div className="grid-row grid-row-2">
                  <ForecastChart
                    forecastData={forecast}
                    complaints={complaints}
                  />
                  <SLAPerformanceChart
                    departments={departments}
                    stats={stats}
                  />
                </div>

                <div className="grid-row grid-row-2">
                  <PeakHoursChart complaints={complaints} />
                  <AIIntelligenceChart
                    complaints={complaints}
                    stats={stats}
                  />
                </div>

                <div className="grid-row grid-row-2">
                  <HotspotMap hotspots={hotspots} />
                  <OperationalInsights
                    stats={stats}
                    complaints={complaints}
                    departments={departments}
                    onNavigateHistory={() => navigateView("history")}
                  />
                </div>
              </>
            )}
          </main>
        )}

        {view === "copilot" && (
          <main className="dashboard-grid">
            <AIAgentConsole stats={stats} complaints={complaints} />
          </main>
        )}

        {view === "history" && (
          <main className="dashboard-grid">
            <ComplaintHistory
              complaints={complaints}
              currentUser={currentUser}
              onSelectComplaint={handleSelectComplaint}
              onDeleteComplaint={handleDeleteComplaint}
              onNavigateReport={() => navigateView("report")}
            />
          </main>
        )}

        {view === "report" && (
          <main className="dashboard-grid">
            <ReportForm
              onSubmitted={handleSubmitted}
              user={currentUser}
            />
          </main>
        )}

        {view === "profile" && (
          <main className="dashboard-grid profile-view-wrapper">
            <ProfileSettings
              user={currentUser}
              onSave={handleSaveProfile}
              onBack={() => window.history.back()}
            />
          </main>
        )}

      </div>
    </div>
  );
}
