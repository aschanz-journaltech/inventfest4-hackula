import React, { useState } from "react";
import {
  jiraApi,
  type JiraUser,
  type JiraOAuthConfig,
} from "../services/jiraApi";
import "./LoginForm.css";

interface LoginFormProps {
  onLoginSuccess: (user: JiraUser) => void;
  onError: (error: string) => void;
}

interface LoginCredentials {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onError,
}) => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    baseUrl: "",
    clientId: "",
    clientSecret: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev: LoginCredentials) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate inputs
      if (!credentials.baseUrl || !credentials.clientId || !credentials.clientSecret) {
        throw new Error("All fields are required");
      }

      // Validate URL format
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(credentials.baseUrl)) {
        throw new Error("Base URL must start with http:// or https://");
      }

      const redirectUri = `${window.location.origin}/oauth/callback`;
      const config: JiraOAuthConfig = {
        ...credentials,
        redirectUri,
      };

      const { url } = await jiraApi.getAuthorizationUrl(config);
      window.location.href = url;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      onError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h1>Login to JIRA</h1>
        <p className="login-description">
          Enter your JIRA credentials to access your workspace.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="baseUrl">JIRA Base URL</label>
            <input
              type="url"
              id="baseUrl"
              name="baseUrl"
              value={credentials.baseUrl}
              onChange={handleInputChange}
              placeholder="https://your-domain.atlassian.net"
              required
              disabled={isLoading}
            />
            <small>
              Your JIRA instance URL (e.g., https://company.atlassian.net)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="clientId">OAuth Client ID</label>
            <input
              type="text"
              id="clientId"
              name="clientId"
              value={credentials.clientId}
              onChange={handleInputChange}
              placeholder="your-oauth-client-id"
              required
              disabled={isLoading}
            />
            <small>Your Atlassian OAuth 2.0 Client ID</small>
          </div>

          <div className="form-group">
            <label htmlFor="clientSecret">OAuth Client Secret</label>
            <div className="password-input-container">
              <input
                type={showClientSecret ? "text" : "password"}
                id="clientSecret"
                name="clientSecret"
                value={credentials.clientSecret}
                onChange={handleInputChange}
                placeholder="Your OAuth client secret"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowClientSecret(!showClientSecret)}
                disabled={isLoading}
              >
                {showClientSecret ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            <small>
              <a
                href="https://developer.atlassian.com/console/myapps/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Create an OAuth app here
              </a>
            </small>
          </div>

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? "Connecting..." : "Login to JIRA"}
          </button>
        </form>

        <div className="help-section">
          <h3>How to set up OAuth 2.0:</h3>
          <ol>
            <li>Go to the Atlassian Developer Console</li>
            <li>Create a new OAuth 2.0 integration</li>
            <li>Set the callback URL to: {window.location.origin}/oauth/callback</li>
            <li>Add the required permissions (read:jira-user, read:jira-work)</li>
            <li>Copy your Client ID and Client Secret</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
