import { useState } from "react";
import { OAuthLogin } from "./components/OAuthLogin";
import { Dashboard } from "./components/Dashboard";
import Shayboard from "./components/Shayboard.tsx";
import { jiraApi, type JiraUser } from "./services/jiraApi";
import "./App.css";

// Import debug utilities (available in browser console as window.oauthDebug)
import "./utils/oauthDebug";

function App() {
  const [user, setUser] = useState<JiraUser | null>(null);
  const [error, setError] = useState<string>("");

  const handleLoginSuccess = (userData: JiraUser) => {
    setUser(userData);
    setError("");
  };

  const handleLoginError = (errorMessage: string) => {
    setError(errorMessage);
    setUser(null);
  };

  const handleLogout = () => {
    jiraApi.logout();
    setUser(null);
    setError("");
  };

  const path = window.location.pathname;

  return (
    <div className="App">
      {path === "/shayboard" ? (
        <Shayboard />
      ) : (
        <>
          {error && (
            <div className="error-notification">
              <span>{error}</span>
              <button onClick={() => setError("")} className="error-close">
                ×
              </button>
            </div>
          )}

          {!user ? (
            <OAuthLogin
              onLoginSuccess={handleLoginSuccess}
              onError={handleLoginError}
            />
          ) : (
            <Dashboard user={user} onLogout={handleLogout} />
          )}
        </>
      )}
    </div>
  );
}

export default App;
