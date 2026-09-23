import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, isFirebaseReady } from "./firebase";

const initialAuthForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const initialEmailForm = {
  purpose: "",
  recipient: "",
  context: "",
  importantPoints: "",
  tone: "Professional",
  formality: "Formal",
  length: "Medium",
  language: "English",
};

function App() {
  const [mode, setMode] = useState("login");
  const [authForm, setAuthForm] = useState(initialAuthForm);
  const [emailForm, setEmailForm] = useState(initialEmailForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!isFirebaseReady || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const savedHistory = JSON.parse(
      localStorage.getItem(`ai-email-history-${user.uid}`) || "[]"
    );
    setHistory(savedHistory);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem(
      `ai-email-history-${user.uid}`,
      JSON.stringify(history)
    );
  }, [history, user]);

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleEmailFieldChange = (event) => {
    const { name, value } = event.target;
    setEmailForm((previous) => ({ ...previous, [name]: value }));
  };

  const mapFirebaseError = (firebaseError) => {
    const code = firebaseError?.code || "";

    switch (code) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please log in instead.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password should be at least 6 characters long.";
      case "auth/user-not-found":
        return "No account found with that email.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a moment and try again.";
      default:
        return firebaseError?.message || "Something went wrong. Please try again.";
    }
  };

  const validateAuthForm = () => {
    if (!authForm.email.trim() || !authForm.password.trim()) {
      return "Email and password are required.";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(authForm.email.trim())) {
      return "Please enter a valid email address.";
    }

    if (authForm.password.length < 6) {
      return "Password must be at least 6 characters long.";
    }

    if (mode === "signup") {
      if (!authForm.name.trim()) {
        return "Name is required.";
      }

      if (!authForm.confirmPassword.trim()) {
        return "Please confirm your password.";
      }

      if (authForm.password !== authForm.confirmPassword) {
        return "Passwords do not match.";
      }
    }

    return "";
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validationMessage = validateAuthForm();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    if (!auth) {
      setError("Firebase is not configured yet. Add your VITE_FIREBASE_* values.");
      return;
    }

    setSubmitting(true);

    try {
      if (mode === "signup") {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          authForm.email.trim(),
          authForm.password
        );

        await updateProfile(userCredential.user, {
          displayName: authForm.name.trim(),
        });
      } else {
        await signInWithEmailAndPassword(auth, authForm.email.trim(), authForm.password);
      }

      setAuthForm(initialAuthForm);
    } catch (firebaseError) {
      setError(mapFirebaseError(firebaseError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;

    try {
      await signOut(auth);
      setResult(null);
    } catch (firebaseError) {
      setError(mapFirebaseError(firebaseError));
    }
  };

  const validateEmailRequest = () => {
    for (const field of Object.keys(initialEmailForm)) {
      if (typeof emailForm[field] !== "string") {
        return "Please complete all email fields.";
      }

      if (!emailForm[field].trim()) {
        return "All email fields are required before generating.";
      }
    }

    return "";
  };

  const handleGenerateEmail = async () => {
    const validationMessage = validateEmailRequest();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setGenerating(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("http://localhost:5000/api/generate-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate email.");
      }

      const generatedEmail = {
        ...data.data,
        createdAt: new Date().toISOString(),
        purpose: emailForm.purpose,
        recipient: emailForm.recipient,
        tone: emailForm.tone,
      };

      setResult(data.data);
      setHistory((previous) => [generatedEmail, ...previous].slice(0, 20));
    } catch (fetchError) {
      setError(fetchError.message || "Unable to generate the email right now.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(`Subject: ${result.subject}\n\n${result.body}`);
      setError("Email copied to clipboard.");
    } catch (copyError) {
      setError("Copy failed. Please select and copy the text manually.");
    }
  };

  const handleClear = () => {
    setEmailForm(initialEmailForm);
    setResult(null);
    setError("");
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="status-card">
          <h2>Loading authentication...</h2>
        </div>
      </div>
    );
  }

  if (!isFirebaseReady || !auth) {
    return (
      <div className="page-shell">
        <div className="status-card">
          <h2>Firebase is not configured</h2>
          <p>Add your Firebase environment values to the frontend .env file.</p>
        </div>
      </div>
    );
  }

  if (user) {
    const topTone = history.length
      ? Object.entries(
          history.reduce((counts, entry) => {
            counts[entry.tone] = (counts[entry.tone] || 0) + 1;
            return counts;
          }, {})
        ).sort((a, b) => b[1] - a[1])[0]
      : ["Professional", 0];

    const renderDashboard = () => (
      <main className="dashboard-main">
        <div className="workspace-header">
          <div>
            <p className="eyebrow">Protected dashboard</p>
            <h1>New email</h1>
          </div>
        </div>

        <div className="workspace-grid">
          <section className="generator-panel">
            <div className="panel-header">
              <h2>Email Generator</h2>
            </div>

            <div className="form-grid">
              <label className="field-group">
                <span>Purpose</span>
                <input
                  type="text"
                  name="purpose"
                  value={emailForm.purpose}
                  onChange={handleEmailFieldChange}
                  placeholder="Leave request, follow-up, meeting request..."
                />
              </label>

              <label className="field-group">
                <span>Recipient</span>
                <input
                  type="text"
                  name="recipient"
                  value={emailForm.recipient}
                  onChange={handleEmailFieldChange}
                  placeholder="Manager, recruiter, client..."
                />
              </label>

              <label className="field-group full-width">
                <span>Context</span>
                <textarea
                  name="context"
                  value={emailForm.context}
                  onChange={handleEmailFieldChange}
                  rows="4"
                  placeholder="What is happening? Give useful background information."
                />
              </label>

              <label className="field-group full-width">
                <span>Important Points</span>
                <textarea
                  name="importantPoints"
                  value={emailForm.importantPoints}
                  onChange={handleEmailFieldChange}
                  rows="4"
                  placeholder="Key details, dates, requests, or items that must appear."
                />
              </label>

              <label className="field-group">
                <span>Tone</span>
                <select name="tone" value={emailForm.tone} onChange={handleEmailFieldChange}>
                  <option>Professional</option>
                  <option>Friendly</option>
                  <option>Warm</option>
                  <option>Formal</option>
                  <option>Casual</option>
                </select>
              </label>

              <label className="field-group">
                <span>Formality</span>
                <select name="formality" value={emailForm.formality} onChange={handleEmailFieldChange}>
                  <option>Formal</option>
                  <option>Semi-formal</option>
                  <option>Casual</option>
                </select>
              </label>

              <label className="field-group">
                <span>Length</span>
                <select name="length" value={emailForm.length} onChange={handleEmailFieldChange}>
                  <option>Short</option>
                  <option>Medium</option>
                  <option>Long</option>
                </select>
              </label>

              <label className="field-group">
                <span>Language</span>
                <select name="language" value={emailForm.language} onChange={handleEmailFieldChange}>
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Spanish</option>
                </select>
              </label>
            </div>

            <div className="action-row">
              <button type="button" className="primary-button" onClick={handleGenerateEmail} disabled={generating}>
                {generating ? "Generating..." : "Generate Email"}
              </button>
              <button type="button" className="secondary-button" onClick={handleClear}>
                Clear
              </button>
            </div>

            {error && <div className={error.includes("copied") ? "success-box" : "error-box"}>{error}</div>}
          </section>

          <section className="output-panel">
            <div className="panel-header">
              <h2>Generated Email</h2>
              {result && (
                <button type="button" className="copy-button" onClick={handleCopy}>
                  Copy
                </button>
              )}
            </div>

            {result ? (
              <div className="output-box">
                <div className="output-subject">
                  <span className="output-label">Subject</span>
                  <h3>{result.subject}</h3>
                </div>

                <div className="output-body">
                  <span className="output-label">Email body</span>
                  <p>{result.body}</p>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>Your generated email will appear here.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    );

    const renderAnalytics = () => (
      <main className="dashboard-main">
        <div className="workspace-header">
          <div>
            <p className="eyebrow">Analytics</p>
            <h1>History & insights</h1>
          </div>
        </div>

        <div className="analytics-grid">
          <div className="metric-card">
            <span>Total emails</span>
            <strong>{history.length}</strong>
          </div>
          <div className="metric-card">
            <span>Most used tone</span>
            <strong>{topTone[1] ? topTone[0] : "Professional"}</strong>
          </div>
          <div className="metric-card">
            <span>Last generated</span>
            <strong>
              {history[0]
                ? new Date(history[0].createdAt).toLocaleDateString()
                : "No activity yet"}
            </strong>
          </div>
        </div>

        <section className="analytics-panel">
          <div className="panel-header">
            <h2>Recent history</h2>
          </div>

          {history.length === 0 ? (
            <div className="empty-state small">
              <p>No generated emails yet.</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((item, index) => (
                <button
                  type="button"
                  className="history-item"
                  key={`${item.subject}-${index}`}
                  onClick={() => {
                    setResult({ subject: item.subject, body: item.body });
                    setActiveTab("dashboard");
                  }}
                >
                  <div>
                    <strong>{item.subject}</strong>
                    <span>{item.purpose}</span>
                  </div>
                  <small>{new Date(item.createdAt).toLocaleDateString()}</small>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    );

    const renderProfile = () => (
      <main className="dashboard-main">
        <div className="workspace-header">
          <div>
            <p className="eyebrow">Profile</p>
            <h1>Account details</h1>
          </div>
        </div>

        <section className="profile-panel">
          <div className="profile-avatar">{(user.displayName || "U").charAt(0).toUpperCase()}</div>
          <h2>{user.displayName || "User"}</h2>
          <p>{user.email}</p>
          <div className="profile-meta">
            <span>User ID</span>
            <strong>{user.uid}</strong>
          </div>
          <button type="button" className="logout-button large" onClick={handleLogout}>
            Logout
          </button>
        </section>
      </main>
    );

    return (
      <div className="dashboard-shell">
        <aside className="sidebar">
          <div className="brand-block">
            <div className="brand-mark">AI</div>
            <div>
              <strong>AI Email Copilot</strong>
            </div>
          </div>

          <nav className="nav-menu">
            <button
              type="button"
              className={`nav-item ${activeTab === "dashboard" ? "active" : "muted"}`}
              onClick={() => setActiveTab("dashboard")}
            >
              Dashboard
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === "analytics" ? "active" : "muted"}`}
              onClick={() => setActiveTab("analytics")}
            >
              Analytics
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === "profile" ? "active" : "muted"}`}
              onClick={() => setActiveTab("profile")}
            >
              Profile
            </button>
          </nav>

          <div className="profile-box">
            <p className="label">Signed in</p>
            <strong>{user.displayName || "User"}</strong>
            <span>{user.email}</span>
          </div>

          <button type="button" className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </aside>

        {activeTab === "dashboard" && renderDashboard()}
        {activeTab === "analytics" && renderAnalytics()}
        {activeTab === "profile" && renderProfile()}
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="auth-card">
        <div className="brand-row">
          <div className="brand-mark">AI</div>
          <span>AI Email Copilot</span>
        </div>

        <h1>{mode === "login" ? "Welcome back" : "Create account"}</h1>
        <p className="subtitle">
          {mode === "login"
            ? "Sign in to continue to your workspace."
            : "Create your account to start generating emails."}
        </p>

        <form onSubmit={handleAuthSubmit} className="auth-form">
          {mode === "signup" && (
            <label className="field-group">
              <span>Name</span>
              <input
                type="text"
                name="name"
                value={authForm.name}
                onChange={handleAuthChange}
                placeholder="Your name"
              />
            </label>
          )}

          <label className="field-group">
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={authForm.email}
              onChange={handleAuthChange}
              placeholder="you@example.com"
            />
          </label>

          <label className="field-group">
            <span>Password</span>
            <input
              type="password"
              name="password"
              value={authForm.password}
              onChange={handleAuthChange}
              placeholder="Minimum 6 characters"
            />
          </label>

          {mode === "signup" && (
            <label className="field-group">
              <span>Confirm password</span>
              <input
                type="password"
                name="confirmPassword"
                value={authForm.confirmPassword}
                onChange={handleAuthChange}
                placeholder="Re-enter password"
              />
            </label>
          )}

          {error && <div className="error-box">{error}</div>}

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting
              ? mode === "login"
                ? "Logging in..."
                : "Creating account..."
              : mode === "login"
                ? "Login"
                : "Sign up"}
          </button>
        </form>

        <button
          type="button"
          className="toggle-link"
          onClick={() => {
            setMode((previous) => (previous === "login" ? "signup" : "login"));
            setError("");
            setAuthForm(initialAuthForm);
          }}
        >
          {mode === "login"
            ? "Need an account? Sign up"
            : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}

export default App;