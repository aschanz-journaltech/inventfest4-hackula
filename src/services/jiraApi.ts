import axios, { type AxiosInstance } from "axios";

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
  avatarUrls: {
    "48x48": string;
    "24x24": string;
    "16x16": string;
    "32x32": string;
  };
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  simplified: boolean;
  style: string;
  isPrivate: boolean;
  properties: Record<string, unknown>;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
      statusCategory: {
        name: string;
        colorName: string;
      };
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    created: string;
    updated: string;
    priority: {
      name: string;
    };
  };
}

export interface JiraSearchResponse {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface JiraOAuthConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface JiraTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface JiraOAuthState {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

class JiraApiService {
  private api: AxiosInstance | null = null;
  private accessToken: string | null = null;
  private baseUrl: string | null = null;
  private clientId: string | null = null;
  private clientSecret: string | null = null;

  /**
   * Get the OAuth authorization URL for JIRA
   */
  async getAuthorizationUrl(config: JiraOAuthConfig): Promise<{ url: string }> {
    // Store config for later use
    this.baseUrl = config.baseUrl.endsWith("/")
      ? config.baseUrl.slice(0, -1)
      : config.baseUrl;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;

    // Store state in sessionStorage for OAuth callback
    const state = JSON.stringify({
      baseUrl: this.baseUrl,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
    } as JiraOAuthState);

    sessionStorage.setItem("jira_oauth_state", state);

    const params = new URLSearchParams({
      audience: "api.atlassian.com",
      client_id: config.clientId,
      scope: "read:jira-user read:jira-work",
      redirect_uri: config.redirectUri,
      state: btoa(JSON.stringify({ baseUrl: this.baseUrl })),
      response_type: "code",
      prompt: "consent",
      code_challenge_method: "S256",
    });

    const authUrl = `https://auth.atlassian.com/authorize?${params.toString()}`;

    return { url: authUrl };
  }

  /**
   * Handle OAuth callback and exchange code for access token
   */
  async handleOAuthCallback(code: string, state: string): Promise<JiraUser> {
    try {
      // Restore state from sessionStorage
      const storedState = sessionStorage.getItem("jira_oauth_state");
      if (!storedState) {
        throw new Error("OAuth state not found. Please try logging in again.");
      }

      const oauthState: JiraOAuthState = JSON.parse(storedState);
      const stateData = JSON.parse(atob(state));

      // Verify state matches
      if (stateData.baseUrl !== oauthState.baseUrl) {
        throw new Error("OAuth state mismatch. Possible security issue.");
      }

      this.baseUrl = oauthState.baseUrl;
      this.clientId = oauthState.clientId;
      this.clientSecret = oauthState.clientSecret;

      // Exchange authorization code for access token
      const tokenResponse = await this.exchangeCodeForToken(code);

      // Store access token
      this.accessToken = tokenResponse.access_token;

      // First, get the accessible resources to find the cloud ID
      const resources = await this.getAccessibleResources();
      if (!resources || resources.length === 0) {
        throw new Error("No accessible Jira sites found for this account");
      }

      // Find the resource that matches our base URL or use the first one
      const resource =
        resources.find(
          (r) =>
            this.baseUrl &&
            r.url.includes(this.baseUrl.replace(/^https?:\/\//, ""))
        ) || resources[0];

      console.log(
        "📍 Using Jira site:",
        resource.name,
        "- Cloud ID:",
        resource.id
      );

      // Create axios instance with Bearer token
      // Use proxy in development to avoid CORS issues
      const apiBaseURL = import.meta.env.DEV
        ? `/api/jira/${resource.id}/rest/api/3`
        : `https://api.atlassian.com/ex/jira/${resource.id}/rest/api/3`;

      this.api = axios.create({
        baseURL: apiBaseURL,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      // Get user info to verify authentication
      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error("Failed to get user information after authentication");
      }

      // Clean up stored state
      sessionStorage.removeItem("jira_oauth_state");

      return user;
    } catch (error) {
      sessionStorage.removeItem("jira_oauth_state");
      this.cleanup();
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(code: string): Promise<JiraTokenResponse> {
    if (!this.clientId) {
      throw new Error("Client ID not set");
    }

    if (!this.clientSecret) {
      throw new Error("Client Secret not set");
    }

    // Get the redirect URI from stored state
    const storedState = sessionStorage.getItem("jira_oauth_state");
    if (!storedState) {
      throw new Error("OAuth state not found during token exchange");
    }

    const oauthState: JiraOAuthState = JSON.parse(storedState);
    const redirectUri = oauthState.redirectUri;

    console.log("🔄 Token exchange attempt:", {
      clientId: this.clientId,
      redirectUri: redirectUri,
      hasCode: !!code,
      hasClientSecret: !!this.clientSecret,
      currentUrl: window.location.href,
    });

    const response = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Token exchange failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        requestDetails: {
          clientId: this.clientId,
          redirectUri: redirectUri,
          grantType: "authorization_code",
          hasCode: !!code,
          hasClientSecret: !!this.clientSecret,
          codeLength: code?.length,
        },
        troubleshooting: {
          checkClientId: "Verify this matches your Atlassian OAuth app exactly",
          checkRedirectUri:
            "This must match the callback URL in your OAuth app settings",
          checkOAuthApp: "Ensure OAuth app is enabled and has correct scopes",
        },
      });
      throw new Error(
        `Token exchange failed: ${response.status} - ${errorData}`
      );
    }

    return response.json() as Promise<JiraTokenResponse>;
  }

  /**
   * Get accessible resources (sites) for the authenticated user
   */
  async getAccessibleResources(): Promise<
    Array<{ id: string; name: string; url: string }>
  > {
    if (!this.accessToken) {
      throw new Error("Not authenticated. Please login first.");
    }

    try {
      const response = await fetch(
        "https://api.atlassian.com/oauth/token/accessible-resources",
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get accessible resources");
      }

      return response.json();
    } catch (error) {
      console.error("Error fetching accessible resources:", error);
      throw error;
    }
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<JiraUser | null> {
    if (!this.api) {
      throw new Error("Not authenticated. Please login first.");
    }

    try {
      const response = await this.api.get("/myself");
      return response.data as JiraUser;
    } catch (error) {
      console.error("Error fetching current user:", error);
      return null;
    }
  }

  /**
   * Get projects accessible to the user
   */
  async getProjects(): Promise<JiraProject[]> {
    if (!this.api) {
      throw new Error("Not authenticated. Please login first.");
    }

    try {
      const response = await this.api.get("/project");
      return response.data;
    } catch (error) {
      console.error("Error fetching projects:", error);
      throw error;
    }
  }

  /**
   * Get issues from a specific project
   */
  async getIssues(
    projectKey: string,
    maxResults: number = 50
  ): Promise<JiraSearchResponse> {
    if (!this.api) {
      throw new Error("Not authenticated. Please login first.");
    }

    try {
      const response = await this.api.get("/search/jql", {
        params: {
          jql: `project = "${projectKey}"`,
          maxResults,
          fields: "summary,status,assignee,created,updated,priority",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching issues:", error);
      throw error;
    }
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.api !== null && this.accessToken !== null;
  }

  /**
   * Get current base URL
   */
  getBaseUrl(): string | null {
    return this.baseUrl;
  }

  /**
   * Get current access token (for debugging purposes only)
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Clean up authentication state
   */
  private cleanup(): void {
    this.api = null;
    this.accessToken = null;
    this.baseUrl = null;
    this.clientId = null;
    this.clientSecret = null;
  }

  /**
   * Logout and clear credentials
   */
  logout(): void {
    sessionStorage.removeItem("jira_oauth_state");
    // Optionally clear saved config on logout
    // localStorage.removeItem("jira_oauth_config");
    this.cleanup();
  }

  /**
   * Clear saved OAuth configuration from localStorage
   */
  clearSavedConfig(): void {
    localStorage.removeItem("jira_oauth_config");
  }

  /**
   * Get diagnostic information for troubleshooting OAuth issues
   */
  getDiagnosticInfo(): {
    currentRedirectUri: string;
    savedConfig: { baseUrl: string; clientId: string } | null;
    hasStoredState: boolean;
  } {
    const currentRedirectUri = `${window.location.origin}${window.location.pathname}`;
    const savedConfig = localStorage.getItem("jira_oauth_config");
    const hasStoredState = !!sessionStorage.getItem("jira_oauth_state");

    return {
      currentRedirectUri,
      savedConfig: savedConfig ? JSON.parse(savedConfig) : null,
      hasStoredState,
    };
  }
}

// Export a singleton instance
export const jiraApi = new JiraApiService();
