import React, { useState, useEffect } from "react";
import {
  jiraApi,
  type JiraOAuthConfig,
  type JiraUser,
} from "../services/jiraApi";
import "./OAuthLogin.css";

interface OAuthLoginProps {
  onLoginSuccess: (user: JiraUser) => void;
  onError: (error: string) => void;
}

export const OAuthLogin: React.FC<OAuthLoginProps> = ({
  onLoginSuccess,
  onError,
}) => {
  const [config, setConfig] = useState<JiraOAuthConfig>(() => {
    // Load saved configuration from localStorage
    const savedConfig = localStorage.getItem("jira_oauth_config");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        return {
          baseUrl: parsed.baseUrl || "",
          clientId: parsed.clientId || "",
          redirectUri: `${window.location.origin}${window.location.pathname}`,
        };
      } catch (error) {
        console.error("Error loading saved OAuth config:", error);
      }
    }

    return {
      baseUrl: "",
      clientId: "",
      redirectUri: `${window.location.origin}${window.location.pathname}`,
    };
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);

  useEffect(() => {
    const handleOAuthCallback = async (code: string, state: string) => {
      setIsProcessingCallback(true);
      try {
        const user = await jiraApi.handleOAuthCallback(code, state);
        onLoginSuccess(user);
        // Clean up URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      } catch (error) {
        let errorMessage =
          error instanceof Error ? error.message : "OAuth callback failed";

        // Provide helpful error messages for common OAuth issues
        if (
          errorMessage.includes("401") &&
          errorMessage.includes("access_denied")
        ) {
          errorMessage +=
            "\n\nThis usually means:\n• The callback URL in your OAuth app doesn't match exactly\n• The Client ID is incorrect\n• The OAuth app is not configured properly\n\nPlease check your Atlassian Developer Console settings.";
        }

        onError(errorMessage);
        // Clean up URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      } finally {
        setIsProcessingCallback(false);
      }
    };

    // Check if we're returning from OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    const error = urlParams.get("error");

    if (error) {
      onError(`OAuth error: ${error}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, [onLoginSuccess, onError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate inputs
      if (!config.baseUrl || !config.clientId) {
        throw new Error("Base URL and Client ID are required");
      }

      // Validate URL format
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(config.baseUrl)) {
        throw new Error("Base URL must start with http:// or https://");
      }

      // Save configuration to localStorage for future use
      localStorage.setItem(
        "jira_oauth_config",
        JSON.stringify({
          baseUrl: config.baseUrl,
          clientId: config.clientId,
        })
      );

      // Get authorization URL and redirect
      const { url } = await jiraApi.getAuthorizationUrl(config);

      // Redirect to JIRA OAuth page
      window.location.href = url;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to initiate OAuth flow";
      onError(errorMessage);
      setIsLoading(false);
    }
  };

  if (isProcessingCallback) {
    return (
      <div className="oauth-container">
        <div className="oauth-form">
          <div className="oauth-callback-processing">
            <div className="spinner"></div>
            <h2>Processing login...</h2>
            <p>Please wait while we complete your authentication.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="oauth-container">
      <div className="oauth-form">
        <h1>Login to JIRA with OAuth</h1>
        <p className="oauth-description">
          Securely connect to your JIRA instance using OAuth 2.0 authentication.
        </p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="baseUrl">JIRA Base URL</label>
            <input
              type="url"
              id="baseUrl"
              name="baseUrl"
              value={config.baseUrl}
              onChange={handleInputChange}
              placeholder="https://your-domain.atlassian.net"
              required
              disabled={isLoading}
            />
            <small>Your JIRA instance URL</small>
          </div>

          <div className="form-group">
            <label htmlFor="clientId">OAuth Client ID</label>
            <input
              type="text"
              id="clientId"
              name="clientId"
              value={config.clientId}
              onChange={handleInputChange}
              placeholder="Your OAuth app client ID"
              required
              disabled={isLoading}
            />
            <small>OAuth client ID from your Atlassian OAuth app</small>
          </div>

          <div className="form-group">
            <label htmlFor="redirectUri">Redirect URI</label>
            <input
              type="url"
              id="redirectUri"
              name="redirectUri"
              value={config.redirectUri}
              onChange={handleInputChange}
              placeholder="https://your-app.com/callback"
              required
              disabled={isLoading}
              readOnly
            />
            <small>
              This URL must be configured in your OAuth app settings
            </small>
          </div>

          <button
            type="submit"
            className="oauth-login-button"
            disabled={isLoading}
          >
            {isLoading ? "Redirecting..." : "Login with JIRA OAuth"}
          </button>
        </form>

        <div className="oauth-help-section">
          <h3>How to set up OAuth for JIRA:</h3>
          <ol>
            <li>
              Go to{" "}
              <a
                href="https://developer.atlassian.com/console/myapps"
                target="_blank"
                rel="noopener noreferrer"
              >
                Atlassian Developer Console
              </a>
            </li>
            <li>Create a new app or select an existing one</li>
            <li>Add OAuth 2.0 (3LO) authorization</li>
            <li>
              Set the callback URL to: <code>{config.redirectUri}</code>
            </li>
            <li>
              Add scopes: <code>read:jira-user</code> and{" "}
              <code>read:jira-work</code>
            </li>
            <li>Copy the Client ID and paste it above</li>
          </ol>

          <div className="oauth-security-note">
            <h4>🔒 Security Benefits of OAuth:</h4>
            <ul>
              <li>No need to store passwords or API tokens</li>
              <li>Secure token-based authentication</li>
              <li>Automatic token expiration and refresh</li>
              <li>Granular permission scopes</li>
              <li>Can be revoked anytime from JIRA settings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
