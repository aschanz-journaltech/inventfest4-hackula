import { jiraApi } from "../services/jiraApi";

/**
 * OAuth debugging utilities for troubleshooting authentication issues
 *
 * Usage in browser console:
 * - window.oauthDebug.getDiagnostics()
 * - window.oauthDebug.clearAll()
 * - window.oauthDebug.validateConfig()
 */
export const oauthDebug = {
  /**
   * Get comprehensive diagnostic information
   */
  getDiagnostics() {
    const diagnostics = jiraApi.getDiagnosticInfo();
    const urlInfo = {
      currentUrl: window.location.href,
      origin: window.location.origin,
      pathname: window.location.pathname,
      search: window.location.search,
    };

    console.group("🔍 OAuth Diagnostics");
    console.log("Current URL Info:", urlInfo);
    console.log("Diagnostic Info:", diagnostics);
    console.log("Session Storage:", {
      oauthState: sessionStorage.getItem("jira_oauth_state"),
    });
    console.log("Local Storage:", {
      savedConfig: localStorage.getItem("jira_oauth_config"),
    });
    console.groupEnd();

    return { diagnostics, urlInfo };
  },

  /**
   * Clear all OAuth-related storage
   */
  clearAll() {
    sessionStorage.removeItem("jira_oauth_state");
    localStorage.removeItem("jira_oauth_config");
    console.log("✅ Cleared all OAuth storage");
  },

  /**
   * Comprehensive OAuth configuration checker
   */
  checkOAuthSetup() {
    console.group("🔧 OAuth Configuration Check");

    const currentRedirectUri = `${window.location.origin}${window.location.pathname}`;
    const savedConfig = localStorage.getItem("jira_oauth_config");

    console.log("1. Current Redirect URI:", currentRedirectUri);
    console.log(
      "   ↳ This MUST match exactly in your Atlassian OAuth app settings"
    );

    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        console.log("2. Saved OAuth Config:", config);

        // Validate base URL format
        if (config.baseUrl) {
          const isValidUrl = /^https?:\/\/.+\.atlassian\.net$/.test(
            config.baseUrl
          );
          console.log(
            `3. Base URL Format: ${isValidUrl ? "✅ Valid" : "❌ Invalid"}`
          );
          if (!isValidUrl) {
            console.warn(
              "   ↳ Should be like: https://your-company.atlassian.net"
            );
          }
        }

        // Validate client ID format
        if (config.clientId) {
          const isValidClientId = /^[A-Za-z0-9]{20,}$/.test(config.clientId);
          console.log(
            `4. Client ID Format: ${
              isValidClientId ? "✅ Looks valid" : "⚠️  Unusual format"
            }`
          );
          console.log(`   ↳ Length: ${config.clientId.length} characters`);
        }

        console.log("\n📋 Checklist for Atlassian Developer Console:");
        console.log("   □ OAuth app is created and enabled");
        console.log("   □ Callback URL exactly matches:", currentRedirectUri);
        console.log("   □ Scopes include: read:jira-user, read:jira-work");
        console.log("   □ Client ID is copied correctly (no extra spaces)");
        console.log("   □ OAuth app is published/enabled");
      } catch (error) {
        console.error("❌ Error parsing saved config:", error);
      }
    } else {
      console.warn("❌ No saved OAuth configuration found");
    }

    console.groupEnd();
  },

  /**
   * Validate OAuth configuration
   */
  validateConfig() {
    const savedConfig = localStorage.getItem("jira_oauth_config");
    if (!savedConfig) {
      console.warn("❌ No saved OAuth configuration found");
      return false;
    }

    try {
      const config = JSON.parse(savedConfig);
      const isValid = config.baseUrl && config.clientId;

      console.log(
        isValid
          ? "✅ OAuth configuration is valid"
          : "❌ OAuth configuration is missing required fields"
      );
      console.log("Config:", config);

      return isValid;
    } catch (error) {
      console.error("❌ Invalid OAuth configuration format:", error);
      return false;
    }
  },

  /**
   * Check if redirect URI matches between saved config and current location
   */
  checkRedirectUri() {
    const currentRedirectUri = `${window.location.origin}${window.location.pathname}`;
    const savedConfig = localStorage.getItem("jira_oauth_config");

    console.log("Current redirect URI:", currentRedirectUri);

    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        console.log("Saved config found:", config);
        console.log(
          "This should match your OAuth app's callback URL in Atlassian Developer Console"
        );
      } catch (error) {
        console.error("Error parsing saved config:", error);
      }
    } else {
      console.log("No saved config found");
    }

    return currentRedirectUri;
  },

  /**
   * Check OAuth callback state (call this when you see OAuth errors)
   */
  checkCallbackState() {
    console.group("🔄 OAuth Callback State Check");

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    const error = urlParams.get("error");

    console.log("URL Parameters:", {
      code: code ? `${code.substring(0, 10)}...` : "❌ Missing",
      state: state ? "✅ Present" : "❌ Missing",
      error: error || "None",
    });

    const storedState = sessionStorage.getItem("jira_oauth_state");
    console.log("Stored OAuth State:", storedState ? "✅ Found" : "❌ Missing");

    if (storedState && state) {
      try {
        const parsed = JSON.parse(storedState);
        const stateData = JSON.parse(atob(state));
        console.log("State Comparison:", {
          storedBaseUrl: parsed.baseUrl,
          receivedBaseUrl: stateData.baseUrl,
          match: parsed.baseUrl === stateData.baseUrl ? "✅" : "❌",
        });
      } catch (error) {
        console.error("❌ Error parsing state:", error);
      }
    }

    if (error) {
      console.error("🚨 OAuth Error from Atlassian:", error);
    }

    console.groupEnd();
  },
};

// Make available globally for debugging
declare global {
  interface Window {
    oauthDebug: typeof oauthDebug;
  }
}

if (typeof window !== "undefined") {
  window.oauthDebug = oauthDebug;
}
