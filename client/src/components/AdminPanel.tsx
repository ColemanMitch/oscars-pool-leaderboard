import { useState, useEffect, useCallback } from "react";
import type { Category } from "../types";

export default function AdminPanel() {
  const [password, setPassword] = useState(
    () => sessionStorage.getItem("admin_token") || ""
  );
  const [authenticated, setAuthenticated] = useState(
    () => !!sessionStorage.getItem("admin_token")
  );
  const [loginError, setLoginError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [tieCategory, setTieCategory] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (authenticated) fetchCategories();
  }, [authenticated, fetchCategories]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      sessionStorage.setItem("admin_token", password);
      setAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Invalid password");
    }
  }

  async function handleSetWinner(category: string, winner: string) {
    setLoading(true);
    try {
      await fetch("/api/winners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("admin_token")}`,
        },
        body: JSON.stringify({ category, winner }),
      });
      await fetchCategories();
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTiedWinner(category: string, winner: string) {
    setLoading(true);
    try {
      await fetch("/api/winners/tie", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("admin_token")}`,
        },
        body: JSON.stringify({ category, winner }),
      });
      setTieCategory(null);
      await fetchCategories();
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveWinner(category: string) {
    setLoading(true);
    try {
      await fetch(`/api/winners/${encodeURIComponent(category)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("admin_token")}`,
        },
      });
      setTieCategory(null);
      await fetchCategories();
    } finally {
      setLoading(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="login-form">
        <h2>Admin Login</h2>
        <form onSubmit={handleLogin}>
          {loginError && <p className="error-msg">{loginError}</p>}
          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn-gold">
            Sign In
          </button>
        </form>
      </div>
    );
  }

  const announced = categories.filter((c) => c.winner && c.winner.length > 0);
  const pending = categories.filter((c) => !c.winner || c.winner.length === 0);

  return (
    <div className="admin-container">
      <div className="header">
        <h1>Admin Panel</h1>
        <p className="subtitle">
          {announced.length} of {categories.length} categories announced
        </p>
      </div>

      {pending.length > 0 && (
        <>
          <h3 style={{ color: "var(--text-secondary)", margin: "16px 0 8px" }}>
            Pending ({pending.length})
          </h3>
          {pending.map((cat) => (
            <div key={cat.name} className="admin-category">
              <div className="admin-cat-header">
                <span className="admin-cat-name">{cat.name}</span>
                <span className="admin-cat-points">{cat.maxPoints} pts</span>
              </div>
              <select
                className="admin-select"
                value=""
                disabled={loading}
                onChange={(e) => {
                  if (e.target.value) handleSetWinner(cat.name, e.target.value);
                }}
              >
                <option value="">Select winner...</option>
                {cat.nominees.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </>
      )}

      {announced.length > 0 && (
        <>
          <h3 style={{ color: "var(--green)", margin: "24px 0 8px" }}>
            Announced ({announced.length})
          </h3>
          {announced.map((cat) => {
            const currentWinners = cat.winner || [];
            const remainingNominees = cat.nominees.filter(
              (n) => !currentWinners.includes(n)
            );
            const showingTieSelect = tieCategory === cat.name;

            return (
              <div key={cat.name} className="admin-category has-winner">
                <div className="admin-cat-header">
                  <span className="admin-cat-name">{cat.name}</span>
                  <span className="admin-cat-points">{cat.maxPoints} pts</span>
                </div>
                {currentWinners.map((w) => (
                  <div
                    key={w}
                    className="admin-cat-winner"
                    style={{ marginBottom: 4 }}
                  >
                    &#x2713; {w}
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {remainingNominees.length > 0 && !showingTieSelect && (
                    <button
                      className="btn btn-gold"
                      disabled={loading}
                      onClick={() => setTieCategory(cat.name)}
                      style={{ fontSize: "0.8rem", padding: "4px 12px" }}
                    >
                      + Add Tie
                    </button>
                  )}
                  <button
                    className="btn btn-danger"
                    disabled={loading}
                    onClick={() => handleRemoveWinner(cat.name)}
                  >
                    Undo
                  </button>
                </div>
                {showingTieSelect && (
                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    <select
                      className="admin-select"
                      value=""
                      disabled={loading}
                      onChange={(e) => {
                        if (e.target.value)
                          handleAddTiedWinner(cat.name, e.target.value);
                      }}
                      style={{ flex: 1 }}
                    >
                      <option value="">Select tied winner...</option>
                      {remainingNominees.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-danger"
                      onClick={() => setTieCategory(null)}
                      style={{ fontSize: "0.8rem", padding: "4px 12px" }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
