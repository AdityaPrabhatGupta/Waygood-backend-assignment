import React, { useState, useEffect } from "react";
import { api } from "./utils/api";
import {
  GraduationCap,
  Search,
  Filter,
  LogOut,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  TrendingUp,
  MapPin,
  DollarSign,
  AlertCircle,
  Calendar,
  ArrowRight,
  Lock,
  Users,
  Briefcase,
  BookOpen,
  ClipboardList
} from "lucide-react";

export default function App() {
  // Authentication & Session
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Navigation tab states
  // Student tabs: 'overview', 'browse', 'applications'
  // Counselor tabs: 'dashboard', 'manage'
  const [activeTab, setActiveTab] = useState("");

  // Auth Mode: 'login' or 'register'
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "student",
    targetCountries: "",
    interestedFields: "",
    preferredIntake: "September",
    maxBudgetUsd: "",
    ieltsScore: ""
  });

  // Data Collections
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [universities, setUniversities] = useState([]);
  const [loadingUniversities, setLoadingUniversities] = useState(false);
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  // Counselor Dashboard Stats
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Program filters state
  const [filters, setFilters] = useState({
    search: "",
    country: "",
    field: "",
    degreeLevel: "",
    maxBudget: "",
    ielts: ""
  });

  // Application creation helper state
  const [appIntakes, setAppIntakes] = useState({}); // programId -> selectedIntake

  // Counselor status transition helper
  const [statusUpdateForm, setStatusUpdateForm] = useState({
    applicationId: null,
    status: "",
    note: ""
  });

  // Load user profile if token is present
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      fetchUserProfile();
    } else {
      localStorage.removeItem("token");
      setUser(null);
    }
  }, [token]);

  // Set default tabs when user state changes
  useEffect(() => {
    if (user) {
      if (user.role === "student") {
        setActiveTab("overview");
        loadStudentData(user.id);
      } else if (user.role === "counselor") {
        setActiveTab("dashboard");
        loadCounselorData();
      }
    }
  }, [user]);

  // Fetch current user details
  const fetchUserProfile = async () => {
    setLoadingUser(true);
    setErrorMsg("");
    try {
      const res = await api.getMe();
      if (res.success) {
        setUser(res.data.user);
      }
    } catch (err) {
      console.error(err);
      handleLogout();
      setErrorMsg("Session expired. Please log in again.");
    } finally {
      setLoadingUser(false);
    }
  };

  // Helper to load student dashboard datasets
  const loadStudentData = async (studentId) => {
    setLoadingRecs(true);
    setLoadingPrograms(true);
    setLoadingApplications(true);

    try {
      // 1. Fetch recommendations
      const recsRes = await api.getRecommendations(studentId);
      if (recsRes.success) {
        setRecommendations(recsRes.data.recommendations);
      }
    } catch (err) {
      console.error("Failed to load recommendations:", err);
    } finally {
      setLoadingRecs(false);
    }

    try {
      // 2. Fetch programs with default filters
      fetchPrograms();
    } catch (err) {
      console.error("Failed to load programs:", err);
    }

    try {
      // 3. Fetch applications
      const appsRes = await api.getApplications();
      if (appsRes.success) {
        setApplications(appsRes.data);
      }
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setLoadingApplications(false);
    }
  };

  // Helper to load counselor dashboard datasets
  const loadCounselorData = async () => {
    setLoadingStats(true);
    setLoadingApplications(true);

    try {
      const statsRes = await api.getDashboardOverview();
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    } finally {
      setLoadingStats(false);
    }

    try {
      const appsRes = await api.getApplications();
      if (appsRes.success) {
        setApplications(appsRes.data);
      }
    } catch (err) {
      console.error("Failed to load master applications:", err);
    } finally {
      setLoadingApplications(false);
    }
  };

  // Fetch programs based on filters state
  const fetchPrograms = async (activeFilters = filters) => {
    setLoadingPrograms(true);
    setErrorMsg("");
    try {
      const res = await api.getPrograms(activeFilters);
      if (res.success) {
        setPrograms(res.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to search programs.");
    } finally {
      setLoadingPrograms(false);
    }
  };

  // Action handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (authMode === "login") {
        const res = await api.login(authForm.email, authForm.password);
        if (res.success) {
          setToken(res.data.token);
          setSuccessMsg("Logged in successfully!");
        }
      } else {
        const payload = {
          fullName: authForm.fullName,
          email: authForm.email,
          password: authForm.password,
          role: authForm.role,
          targetCountries: authForm.targetCountries
            ? authForm.targetCountries.split(",").map((c) => c.trim())
            : [],
          interestedFields: authForm.interestedFields
            ? authForm.interestedFields.split(",").map((f) => f.trim())
            : [],
          preferredIntake: authForm.preferredIntake,
          maxBudgetUsd: authForm.maxBudgetUsd ? Number(authForm.maxBudgetUsd) : 0,
          englishTest: authForm.ieltsScore
            ? { exam: "IELTS", score: Number(authForm.ieltsScore) }
            : { exam: "IELTS", score: 0 }
        };

        const res = await api.register(payload);
        if (res.success) {
          setToken(res.data.token);
          setSuccessMsg("Registered successfully!");
        }
      }
    } catch (err) {
      setErrorMsg(err.message || "Authentication failed.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    setRecommendations([]);
    setPrograms([]);
    setApplications([]);
    setStats(null);
    setErrorMsg("");
    setSuccessMsg("");
  };

  // Quick Login Shortcuts for Reviewers
  const handleQuickLogin = (email, password) => {
    setErrorMsg("");
    setSuccessMsg("");
    setAuthForm((prev) => ({ ...prev, email, password }));
    api.login(email, password)
      .then((res) => {
        if (res.success) {
          setToken(res.data.token);
          setSuccessMsg(`Logged in as ${email}!`);
        }
      })
      .catch((err) => {
        setErrorMsg(err.message || "Failed to log in.");
      });
  };

  // Student apply to a program
  const handleApply = async (programId) => {
    setErrorMsg("");
    setSuccessMsg("");
    const selectedIntake = appIntakes[programId];
    if (!selectedIntake) {
      alert("Please select an intake period before applying.");
      return;
    }

    try {
      const res = await api.createApplication(programId, selectedIntake);
      if (res.success) {
        setSuccessMsg(`Applied to ${res.data.program.title} successfully!`);
        // Refresh application list and dashboard data
        const appsRes = await api.getApplications();
        if (appsRes.success) {
          setApplications(appsRes.data);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to create application.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Counselor updates application status
  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const { applicationId, status, note } = statusUpdateForm;
    if (!applicationId || !status) {
      alert("Please select both a transition status and enter application details.");
      return;
    }

    try {
      const res = await api.updateApplicationStatus(applicationId, status, note);
      if (res.success) {
        setSuccessMsg(`Application status updated to "${status}" successfully!`);
        setStatusUpdateForm({ applicationId: null, status: "", note: "" });
        // Reload counselor stats and applications
        loadCounselorData();
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to update application status.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Run filters apply
  const handleFilterChange = (key, value) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    fetchPrograms(nextFilters);
  };

  const handleClearFilters = () => {
    const reset = {
      search: "",
      country: "",
      field: "",
      degreeLevel: "",
      maxBudget: "",
      ielts: ""
    };
    setFilters(reset);
    fetchPrograms(reset);
  };

  // Match score visual detail calculator
  const renderRecommendationScoreDetail = (rec) => {
    const matchesCountry = rec.explanation.toLowerCase().includes("country");
    const matchesField = rec.explanation.toLowerCase().includes("field");
    const matchesBudget = rec.explanation.toLowerCase().includes("budget");
    const matchesIntake = rec.explanation.toLowerCase().includes("intake");
    const matchesIelts = rec.explanation.toLowerCase().includes("ielts");

    return (
      <div className="rec-breakdown">
        <div className="rec-breakdown-title">Match breakdown</div>
        <div className="breakdown-bar-container">
          <div className="breakdown-row">
            <span>Preferred Country (+40%)</span>
            <span className="score">{matchesCountry ? "✅ Match" : "❌ No Match"}</span>
          </div>
          <div className="breakdown-row">
            <span>Fields of Interest (+25%)</span>
            <span className="score">{matchesField ? "✅ Match" : "❌ No Match"}</span>
          </div>
          <div className="breakdown-row">
            <span>Budget Ceiling (+20%)</span>
            <span className="score">{matchesBudget ? "✅ Match" : "❌ No Match"}</span>
          </div>
          <div className="breakdown-row">
            <span>English Requirements (+15%)</span>
            <span className="score">{matchesIelts ? "✅ Match" : "❌ No Match"}</span>
          </div>
        </div>
        <div className="breakdown-explanation">
          <strong>Scoring details:</strong> {rec.explanation}
        </div>
      </div>
    );
  };

  // Renders beautiful timeline for an application
  const renderTimeline = (app) => {
    // Sort timeline so newest is first or oldest is first.
    // Standard vertical tracks represent history oldest (top) to newest (bottom).
    return (
      <div className="timeline-container">
        {app.timeline.map((item, index) => {
          const isLatest = index === app.timeline.length - 1;
          return (
            <div key={item._id || index} className={`timeline-item ${item.status}`}>
              <div className={`timeline-marker ${isLatest ? "active" : ""}`}>
                {item.status === "accepted" && <CheckCircle size={14} />}
                {item.status === "rejected" && <XCircle size={14} />}
                {item.status === "applied" && <FileText size={14} />}
                {item.status === "reviewed" && <Clock size={14} />}
              </div>
              <div className="timeline-content">
                <div className="timeline-date">
                  {new Date(item.updatedAt || Date.now()).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </div>
                <div className="timeline-status-text">
                  Status: <span className={`status-pill ${item.status}`}>{item.status}</span>
                </div>
                {item.note && <p className="timeline-note">“{item.note}”</p>}
                {item.changedBy && (
                  <div className="timeline-note" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                    Updated by: <strong>{item.changedBy.fullName}</strong> ({item.changedBy.role})
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ---------------- RENDERS ----------------

  if (loadingUser) {
    return (
      <div className="page-shell" style={{ textAlign: "center", marginTop: "100px" }}>
        <Activity className="animate-spin" size={48} style={{ color: "var(--accent)" }} />
        <p style={{ marginTop: "12px", color: "var(--muted)" }}>Loading user session...</p>
      </div>
    );
  }

  // Not logged in screen
  if (!user) {
    return (
      <main className="page-shell">
        <div className="auth-container">
          <div className="auth-header">
            <h1>Waygood Portal</h1>
            <p>Connect to the study-abroad evaluation APIs</p>
          </div>

          {errorMsg && (
            <div style={{ background: "#fdf2f2", color: "var(--status-rejected)", border: "1px solid #f8b4b4", padding: "12px", borderRadius: "12px", marginBottom: "16px", fontSize: "0.88rem", display: "flex", gap: "8px", alignItems: "center" }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{ background: "#f2faf5", color: "var(--status-accepted)", border: "1px solid #b4f8c8", padding: "12px", borderRadius: "12px", marginBottom: "16px", fontSize: "0.88rem", display: "flex", gap: "8px", alignItems: "center" }}>
              <CheckCircle size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="auth-tabs">
            <button
              className={`auth-tab-btn ${authMode === "login" ? "active" : ""}`}
              onClick={() => setAuthMode("login")}
            >
              Sign In
            </button>
            <button
              className={`auth-tab-btn ${authMode === "register" ? "active" : ""}`}
              onClick={() => setAuthMode("register")}
            >
              Register Account
            </button>
          </div>

          <form onSubmit={handleAuthSubmit}>
            {authMode === "register" && (
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  className="form-input"
                  required
                  placeholder="John Doe"
                  value={authForm.fullName}
                  onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="form-input"
                required
                placeholder="student@example.com"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                required
                placeholder="••••••••"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              />
            </div>

            {authMode === "register" && (
              <>
                <div className="form-group">
                  <label htmlFor="role">I am a...</label>
                  <select
                    id="role"
                    className="form-input"
                    value={authForm.role}
                    onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })}
                  >
                    <option value="student">Student looking for universities</option>
                    <option value="counselor">Counselor managing applications</option>
                  </select>
                </div>

                {authForm.role === "student" && (
                  <>
                    <div className="form-group">
                      <label htmlFor="targetCountries">Target Countries (comma separated)</label>
                      <input
                        id="targetCountries"
                        type="text"
                        className="form-input"
                        placeholder="Canada, UK, UAE"
                        value={authForm.targetCountries}
                        onChange={(e) => setAuthForm({ ...authForm, targetCountries: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="interestedFields">Interested Fields (comma separated)</label>
                      <input
                        id="interestedFields"
                        type="text"
                        className="form-input"
                        placeholder="Computer Science, Data Science"
                        value={authForm.interestedFields}
                        onChange={(e) => setAuthForm({ ...authForm, interestedFields: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="preferredIntake">Preferred Intake</label>
                      <select
                        id="preferredIntake"
                        className="form-input"
                        value={authForm.preferredIntake}
                        onChange={(e) => setAuthForm({ ...authForm, preferredIntake: e.target.value })}
                      >
                        <option value="September">September</option>
                        <option value="January">January</option>
                        <option value="May">May</option>
                        <option value="February">February</option>
                        <option value="July">July</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="maxBudgetUsd">Maximum Annual Budget (USD)</label>
                      <input
                        id="maxBudgetUsd"
                        type="number"
                        className="form-input"
                        placeholder="20000"
                        value={authForm.maxBudgetUsd}
                        onChange={(e) => setAuthForm({ ...authForm, maxBudgetUsd: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="ieltsScore">English IELTS Score (if taken)</label>
                      <input
                        id="ieltsScore"
                        type="number"
                        step="0.5"
                        className="form-input"
                        placeholder="6.5"
                        value={authForm.ieltsScore}
                        onChange={(e) => setAuthForm({ ...authForm, ieltsScore: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <button type="submit" className="btn btn-primary">
              {authMode === "login" ? "Sign In" : "Register Account"}
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Quick Login Shortcuts */}
          <div className="credential-shortcuts">
            <p>Reviewer Quick Login Shortcuts</p>
            <div className="shortcut-buttons">
              <button
                className="shortcut-btn"
                onClick={() => handleQuickLogin("aarav@example.com", "Candidate123!")}
              >
                <div>
                  <div className="name">Aarav Malhotra</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>aarav@example.com</div>
                </div>
                <span className="role-label">Student (CS Target)</span>
              </button>
              <button
                className="shortcut-btn"
                onClick={() => handleQuickLogin("sara@example.com", "Candidate123!")}
              >
                <div>
                  <div className="name">Sara Khan</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>sara@example.com</div>
                </div>
                <span className="role-label">Student (Biz Target)</span>
              </button>
              <button
                className="shortcut-btn"
                onClick={() => handleQuickLogin("counselor@example.com", "Candidate123!")}
              >
                <div>
                  <div className="name">Neha Verma</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>counselor@example.com</div>
                </div>
                <span className="role-label c">Counselor (Admin)</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ---------------- LOGGED IN PORTAL LAYOUT ----------------

  return (
    <main className="page-shell">
      {/* Header */}
      <header className="dashboard-header">
        <div className="brand">
          <GraduationCap size={28} style={{ color: "var(--accent)" }} />
          <h2>Waygood Study-Abroad</h2>
        </div>
        <div className="user-profile-nav">
          <div className="user-tag">
            <User size={16} />
            <span>{user.fullName}</span>
            <span className={`user-role-badge ${user.role}`}>
              {user.role}
            </span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Global Notifications */}
      {errorMsg && (
        <div style={{ background: "#fdf2f2", color: "var(--status-rejected)", border: "1px solid #f8b4b4", padding: "16px", borderRadius: "16px", marginBottom: "24px", display: "flex", gap: "8px", alignItems: "center" }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ background: "#f2faf5", color: "var(--status-accepted)", border: "1px solid #b4f8c8", padding: "16px", borderRadius: "16px", marginBottom: "24px", display: "flex", gap: "8px", alignItems: "center" }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ---------------- STUDENT INTERFACE ---------------- */}
      {user.role === "student" && (
        <>
          {/* Student Profile Card */}
          <section className="student-profile-header">
            <div className="profile-info">
              <h3>Welcome back, {user.fullName}!</h3>
              <p>Looking for your dream programs in study destinations abroad.</p>
            </div>
            <div className="profile-stats">
              <div className="profile-stat-pill">
                <span className="label">Destinations</span>
                <span className="value">{user.targetCountries.join(", ") || "None"}</span>
              </div>
              <div className="profile-stat-pill">
                <span className="label">Interests</span>
                <span className="value">{user.interestedFields.join(", ") || "None"}</span>
              </div>
              <div className="profile-stat-pill">
                <span className="label">IELTS Score</span>
                <span className="value">{user.englishTest?.score || "N/A"}</span>
              </div>
              <div className="profile-stat-pill">
                <span className="label">Max Budget</span>
                <span className="value">${user.maxBudgetUsd.toLocaleString()}/yr</span>
              </div>
            </div>
          </section>

          {/* Student Tabs */}
          <div className="dashboard-tabs">
            <button
              className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Recommended Programs
            </button>
            <button
              className={`tab-btn ${activeTab === "browse" ? "active" : ""}`}
              onClick={() => setActiveTab("browse")}
            >
              Search & Apply
            </button>
            <button
              className={`tab-btn ${activeTab === "applications" ? "active" : ""}`}
              onClick={() => setActiveTab("applications")}
            >
              My Applications ({applications.length})
            </button>
          </div>

          {/* Tab 1: Overview / AI Recommendations */}
          {activeTab === "overview" && (
            <section className="section">
              <div className="recommendation-banner">
                <h3>Dynamic Recommendations Score Card</h3>
                <p>
                  These recommendations are calculated using a MongoDB aggregation pipeline on the backend. Matches are weighted based on preferred country (40%), field match (25%), budget limits (20%), and IELTS benchmarks (15%).
                </p>
              </div>

              {loadingRecs ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <Activity className="animate-spin" size={32} style={{ color: "var(--accent)" }} />
                  <p style={{ marginTop: "8px", color: "var(--muted)" }}>Analyzing best-fit programs...</p>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="empty-state">
                  <h3>No recommendations found</h3>
                  <p>Try expanding your profile interests, budget, or preferred destinations to discover matching programs.</p>
                </div>
              ) : (
                <div className="recommendations-grid">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="rec-card">
                      <div>
                        <div className="rec-header">
                          <div className="rec-title-group">
                            <span className="spotlight-country">{rec.university.country}</span>
                            <h3>{rec.program.title}</h3>
                            <p>{rec.university.name} • {rec.university.city}</p>
                          </div>
                          <div className="rec-score-badge">
                            {rec.score}
                            <span className="rec-score-label">Score</span>
                          </div>
                        </div>

                        <ul className="rec-details-list">
                          <li>💼 {rec.program.field}</li>
                          <li>🎓 {rec.program.degreeLevel}</li>
                          <li>💵 ${rec.program.tuitionFeeUsd.toLocaleString()}/yr</li>
                          <li>📝 IELTS: {rec.program.minimumIelts}+</li>
                        </ul>
                      </div>

                      <div>
                        {renderRecommendationScoreDetail(rec)}

                        <div style={{ marginTop: "16px", display: "flex", gap: "8px", alignItems: "center" }}>
                          <select
                            className="filter-select"
                            style={{ flex: 1, padding: "8px" }}
                            value={appIntakes[rec.program.id] || ""}
                            onChange={(e) => setAppIntakes({ ...appIntakes, [rec.program.id]: e.target.value })}
                          >
                            <option value="">Select intake...</option>
                            {rec.program.intakes.map((intake) => (
                              <option key={intake} value={intake}>{intake}</option>
                            ))}
                          </select>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ width: "auto" }}
                            onClick={() => handleApply(rec.program.id)}
                          >
                            Apply Now
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Tab 2: Browse & Search Programs */}
          {activeTab === "browse" && (
            <div className="search-filter-layout">
              <aside className="filter-sidebar">
                <h3>Filters</h3>
                
                <div className="filter-section">
                  <label htmlFor="searchFilter">Keyword Search</label>
                  <input
                    id="searchFilter"
                    type="text"
                    className="filter-input"
                    placeholder="Search titles or universities..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                  />
                </div>

                <div className="filter-section">
                  <label htmlFor="countryFilter">Country</label>
                  <select
                    id="countryFilter"
                    className="filter-select"
                    value={filters.country}
                    onChange={(e) => handleFilterChange("country", e.target.value)}
                  >
                    <option value="">All Countries</option>
                    <option value="Canada">Canada</option>
                    <option value="UK">UK</option>
                    <option value="Australia">Australia</option>
                    <option value="UAE">UAE</option>
                  </select>
                </div>

                <div className="filter-section">
                  <label htmlFor="fieldFilter">Field of Study</label>
                  <select
                    id="fieldFilter"
                    className="filter-select"
                    value={filters.field}
                    onChange={(e) => handleFilterChange("field", e.target.value)}
                  >
                    <option value="">All Fields</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Business Analytics">Business Analytics</option>
                    <option value="Engineering Management">Engineering Management</option>
                    <option value="Project Management">Project Management</option>
                    <option value="International Business">International Business</option>
                    <option value="Hospitality">Hospitality</option>
                  </select>
                </div>

                <div className="filter-section">
                  <label htmlFor="degreeFilter">Degree Level</label>
                  <select
                    id="degreeFilter"
                    className="filter-select"
                    value={filters.degreeLevel}
                    onChange={(e) => handleFilterChange("degreeLevel", e.target.value)}
                  >
                    <option value="">All Levels</option>
                    <option value="bachelor">Bachelor's</option>
                    <option value="master">Master's</option>
                    <option value="certificate">Graduate Certificate</option>
                  </select>
                </div>

                <div className="filter-section">
                  <label htmlFor="budgetFilter">Max Budget (USD): ${filters.maxBudget ? Number(filters.maxBudget).toLocaleString() : "Any"}</label>
                  <input
                    id="budgetFilter"
                    type="range"
                    min="10000"
                    max="30000"
                    step="1000"
                    className="filter-input"
                    value={filters.maxBudget || "30000"}
                    onChange={(e) => handleFilterChange("maxBudget", e.target.value)}
                  />
                  <div className="slider-container">
                    <span>$10k</span>
                    <span>$30k</span>
                  </div>
                </div>

                <div className="filter-section">
                  <label htmlFor="ieltsFilter">Max Min IELTS requirement: {filters.ielts || "Any"}</label>
                  <select
                    id="ieltsFilter"
                    className="filter-select"
                    value={filters.ielts}
                    onChange={(e) => handleFilterChange("ielts", e.target.value)}
                  >
                    <option value="">Any Score</option>
                    <option value="6.0">6.0</option>
                    <option value="6.5">6.5</option>
                    <option value="7.0">7.0</option>
                  </select>
                </div>

                <button className="btn btn-secondary" style={{ width: "100%", marginTop: "12px" }} onClick={handleClearFilters}>
                  Clear Filters
                </button>
              </aside>

              <section className="programs-list">
                {loadingPrograms ? (
                  <div style={{ textAlign: "center", padding: "40px" }}>
                    <Activity className="animate-spin" size={32} style={{ color: "var(--accent)" }} />
                    <p style={{ marginTop: "8px" }}>Finding programs...</p>
                  </div>
                ) : programs.length === 0 ? (
                  <div className="empty-state">
                    <h3>No programs matching filters</h3>
                    <p>Try resetting the search terms or widening the budget range slider.</p>
                  </div>
                ) : (
                  programs.map((prog) => (
                    <div key={prog._id} className="prog-card">
                      <div className="prog-details">
                        <h3>{prog.title}</h3>
                        <p className="prog-university">{prog.universityName}</p>
                        <div className="prog-meta-row">
                          <span className="prog-meta-item">📍 {prog.city}, {prog.country}</span>
                          <span className="prog-meta-item">💼 {prog.field}</span>
                          <span className="prog-meta-item">🎓 {prog.degreeLevel}</span>
                          <span className="prog-meta-item">⏱️ {prog.durationMonths} months</span>
                          <span className="prog-meta-item">📝 IELTS: {prog.minimumIelts}+</span>
                        </div>
                      </div>

                      <div className="prog-action-box">
                        <span className="prog-fee">${prog.tuitionFeeUsd.toLocaleString()}/yr</span>
                        <div style={{ width: "100%" }}>
                          <select
                            className="filter-select"
                            style={{ padding: "8px", marginBottom: "8px" }}
                            value={appIntakes[prog._id] || ""}
                            onChange={(e) => setAppIntakes({ ...appIntakes, [prog._id]: e.target.value })}
                          >
                            <option value="">Select intake...</option>
                            {prog.intakes.map((intake) => (
                              <option key={intake} value={intake}>{intake}</option>
                            ))}
                          </select>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ width: "100%" }}
                            onClick={() => handleApply(prog._id)}
                          >
                            Submit Application
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </section>
            </div>
          )}

          {/* Tab 3: Student's Applications & Vertical Timelines */}
          {activeTab === "applications" && (
            <section className="section">
              {loadingApplications ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <Activity className="animate-spin" size={32} style={{ color: "var(--accent)" }} />
                  <p>Retrieving your applications...</p>
                </div>
              ) : applications.length === 0 ? (
                <div className="empty-state">
                  <h3>You haven't submitted any applications</h3>
                  <p>Browse through available programs and apply to start your study abroad journey.</p>
                </div>
              ) : (
                <div>
                  <h2 style={{ fontFamily: "IBM Plex Serif", fontSize: "1.8rem", marginBottom: "20px" }}>Your Application Pipeline</h2>
                  {applications.map((app) => (
                    <div key={app._id} className="timeline-card">
                      <div className="timeline-card-header">
                        <div>
                          <span className="spotlight-country">{app.university.country}</span>
                          <h3>{app.program.title}</h3>
                          <p>{app.university.name} • Intake: <strong>{app.intake}</strong></p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                          <span className={`status-pill ${app.status}`}>{app.status}</span>
                          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Tuition: ${app.program.tuitionFeeUsd.toLocaleString()}/yr</span>
                        </div>
                      </div>

                      {/* Timeline flow */}
                      {renderTimeline(app)}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* ---------------- COUNSELOR INTERFACE ---------------- */}
      {user.role === "counselor" && (
        <>
          {/* Counselor Tabs */}
          <div className="dashboard-tabs">
            <button
              className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              Dashboard Stats
            </button>
            <button
              className={`tab-btn ${activeTab === "manage" ? "active" : ""}`}
              onClick={() => setActiveTab("manage")}
            >
              Manage Applications ({applications.length})
            </button>
          </div>

          {/* Tab 1: Dashboard Analytics Overview */}
          {activeTab === "dashboard" && (
            <section className="section">
              {loadingStats || !stats ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <Activity className="animate-spin" size={32} style={{ color: "var(--accent)" }} />
                  <p style={{ marginTop: "8px" }}>Fetching analytics...</p>
                </div>
              ) : (
                <>
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <span>Total Students</span>
                      <strong>{stats.totalStudents}</strong>
                    </div>
                    <div className="metric-card">
                      <span>Managed Programs</span>
                      <strong>{stats.totalPrograms}</strong>
                    </div>
                    <div className="metric-card">
                      <span>Submitted Applications</span>
                      <strong>{stats.totalApplications}</strong>
                    </div>
                    <div className="metric-card">
                      <span>Success Rate</span>
                      <strong>
                        {stats.totalApplications > 0
                          ? Math.round(
                              ((stats.statusBreakdown.find((b) => b._id === "accepted")?.count || 0) /
                                stats.totalApplications) *
                                100
                            )
                          : 0}
                        %
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", marginTop: "24px" }}>
                    <div className="hero-copy" style={{ padding: "28px" }}>
                      <h3 style={{ fontFamily: "IBM Plex Serif", fontSize: "1.4rem", margin: "0 0 16px" }}>Application Status Breakdown</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {stats.statusBreakdown.map((breakdown) => (
                          <div key={breakdown._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                            <span style={{ textTransform: "capitalize", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                              <span className={`status-pill ${breakdown._id}`} style={{ width: "12px", height: "12px", borderRadius: "50%", padding: 0 }}></span>
                              {breakdown._id}
                            </span>
                            <strong style={{ fontSize: "1.1rem" }}>{breakdown.count} applications</strong>
                          </div>
                        ))}
                        {stats.statusBreakdown.length === 0 && (
                          <p style={{ color: "var(--muted)", margin: 0 }}>No application records available yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="hero-copy" style={{ padding: "28px" }}>
                      <h3 style={{ fontFamily: "IBM Plex Serif", fontSize: "1.4rem", margin: "0 0 16px" }}>Top Destination Countries</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {stats.topCountries.map((country, idx) => (
                          <div key={country._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                            <span style={{ fontWeight: "600" }}>#{idx + 1} {country._id}</span>
                            <strong style={{ fontSize: "1.1rem", color: "var(--accent)" }}>{country.count} applications</strong>
                          </div>
                        ))}
                        {stats.topCountries.length === 0 && (
                          <p style={{ color: "var(--muted)", margin: 0 }}>No application records available yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {/* Tab 2: Manage Applications (Counselor view & edit status) */}
          {activeTab === "manage" && (
            <section className="section">
              <h2 style={{ fontFamily: "IBM Plex Serif", fontSize: "1.8rem", marginBottom: "8px" }}>Student Applications Pipeline</h2>
              <p style={{ color: "var(--muted)", margin: "0 0 20px" }}>Double-click or select an application row to update its review stage and trigger status transitions.</p>

              {loadingApplications ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <Activity className="animate-spin" size={32} style={{ color: "var(--accent)" }} />
                  <p>Loading master application pipeline...</p>
                </div>
              ) : applications.length === 0 ? (
                <div className="empty-state">
                  <h3>No applications found</h3>
                  <p>Applications submitted by student accounts will appear here.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {/* Status update details box if one is selected */}
                  {statusUpdateForm.applicationId && (
                    <div className="counselor-action-panel">
                      <h4>Update Stage for Application #{statusUpdateForm.applicationId.slice(-6)}</h4>
                      <form onSubmit={handleUpdateStatusSubmit}>
                        <div className="form-group">
                          <label>Select Transition Status</label>
                          <div className="status-grid">
                            <button
                              type="button"
                              className={`status-select-btn reviewing ${statusUpdateForm.status === "reviewed" ? "active" : ""}`}
                              onClick={() => setStatusUpdateForm({ ...statusUpdateForm, status: "reviewed" })}
                            >
                              Move to Reviewed
                            </button>
                            <button
                              type="button"
                              className={`status-select-btn accepted ${statusUpdateForm.status === "accepted" ? "active" : ""}`}
                              onClick={() => setStatusUpdateForm({ ...statusUpdateForm, status: "accepted" })}
                            >
                              Approve / Accept
                            </button>
                            <button
                              type="button"
                              className={`status-select-btn rejected ${statusUpdateForm.status === "rejected" ? "active" : ""}`}
                              onClick={() => setStatusUpdateForm({ ...statusUpdateForm, status: "rejected" })}
                            >
                              Deny / Reject
                            </button>
                          </div>
                        </div>

                        <div className="form-group">
                          <label htmlFor="note">Counselor Review Note</label>
                          <textarea
                            id="note"
                            rows={3}
                            className="form-input"
                            required
                            placeholder="Enter review decision details, notes, or next steps..."
                            value={statusUpdateForm.note}
                            onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, note: e.target.value })}
                          ></textarea>
                        </div>

                        <div style={{ display: "flex", gap: "12px" }}>
                          <button type="submit" className="btn btn-primary" style={{ width: "auto" }}>
                            Save Transition
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setStatusUpdateForm({ applicationId: null, status: "", note: "" })}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="table-container">
                    <table className="applications-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Program / Major</th>
                          <th>Country</th>
                          <th>Intake</th>
                          <th>Current Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map((app) => (
                          <tr key={app._id}>
                            <td>
                              <strong>{app.student.fullName}</strong>
                              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{app.student.email}</div>
                            </td>
                            <td>
                              <strong>{app.program.title}</strong>
                              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{app.university.name}</div>
                            </td>
                            <td>{app.destinationCountry}</td>
                            <td>{app.intake}</td>
                            <td>
                              <span className={`status-pill ${app.status}`}>{app.status}</span>
                            </td>
                            <td>
                              {app.status === "accepted" || app.status === "rejected" ? (
                                <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: "500" }}>Terminal State</span>
                              ) : (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    // Set default transition based on current status
                                    const nextStatus = app.status === "applied" ? "reviewed" : "accepted";
                                    setStatusUpdateForm({
                                      applicationId: app._id,
                                      status: nextStatus,
                                      note: ""
                                    });
                                    // Scroll to the review panel
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                >
                                  Review App
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
