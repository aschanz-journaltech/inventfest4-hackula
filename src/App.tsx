import { useState } from "react";
import { OAuthLogin } from "./components/OAuthLogin";
import { Dashboard } from "./components/Dashboard";
import { jiraApi, type JiraUser } from "./services/jiraApi";
import "./App.css";

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

  return (
    <div className="App">
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
    </div>
  );
}

export default App;
