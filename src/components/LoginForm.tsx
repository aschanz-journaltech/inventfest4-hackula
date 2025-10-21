import React, { useState } from "react";
import {
  jiraApi,
  type JiraLoginCredentials,
  type JiraUser,
} from "../services/jiraApi";
import "./LoginForm.css";

interface LoginFormProps {
  onLoginSuccess: (user: JiraUser) => void;
  onError: (error: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLoginSuccess,
  onError,
}) => {
  const [credentials, setCredentials] = useState<JiraLoginCredentials>({
    baseUrl: "",
    email: "",
    apiToken: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showApiToken, setShowApiToken] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate inputs
      if (!credentials.baseUrl || !credentials.email || !credentials.apiToken) {
        throw new Error("All fields are required");
      }

      // Validate URL format
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(credentials.baseUrl)) {
        throw new Error("Base URL must start with http:// or https://");
      }

      const user = await jiraApi.login(credentials);
      onLoginSuccess(user);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      onError(errorMessage);
    } finally {
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
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={credentials.email}
              onChange={handleInputChange}
              placeholder="your-email@company.com"
              required
              disabled={isLoading}
            />
            <small>Your JIRA account email address</small>
          </div>

          <div className="form-group">
            <label htmlFor="apiToken">API Token</label>
            <div className="password-input-container">
              <input
                type={showApiToken ? "text" : "password"}
                id="apiToken"
                name="apiToken"
                value={credentials.apiToken}
                onChange={handleInputChange}
                placeholder="Your API token"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowApiToken(!showApiToken)}
                disabled={isLoading}
              >
                {showApiToken ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            <small>
              <a
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
              >
                Create an API token here
              </a>
            </small>
          </div>

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? "Connecting..." : "Login to JIRA"}
          </button>
        </form>

        <div className="help-section">
          <h3>How to get your API token:</h3>
          <ol>
            <li>Go to your Atlassian account settings</li>
            <li>Navigate to Security → API tokens</li>
            <li>Click "Create API token"</li>
            <li>Give it a label and copy the token</li>
            <li>Use that token in the field above</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
