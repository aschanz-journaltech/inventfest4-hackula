# OAuth 401 Error Troubleshooting Guide

When you encounter the error:
```
Token exchange failed: 401 - {"error":"access_denied","error_description":"Unauthorized"}
```

This means Atlassian's OAuth server is rejecting your token exchange request. Here's how to debug and fix it:

## 🔍 Step 1: Use Debug Tools

Open your browser's Developer Console (F12) and run:

```javascript
// Check your current OAuth configuration
window.oauthDebug.checkOAuthSetup()

// If you're seeing the error during callback, run:
window.oauthDebug.checkCallbackState()

// Get comprehensive diagnostics
window.oauthDebug.getDiagnostics()
```

## 🔧 Step 2: Verify Atlassian OAuth App Settings

Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps):

### ✅ Callback URL Must Match Exactly
- Your callback URL in Atlassian must be: `http://localhost:5174/`
- **Common mistakes:**
  - Missing trailing slash: `http://localhost:5174` ❌
  - Wrong port: `http://localhost:5173/` ❌ (unless that's your actual dev server port)
  - Using HTTPS locally: `https://localhost:5174/` ❌

### ✅ Required OAuth Settings
- **Authorization grant type**: Authorization code grants (3LO)
- **Required scopes**: 
  - `read:jira-user`
  - `read:jira-work`
- **App status**: Must be "Enabled" or "Published"

### ✅ Client ID
- Copy the Client ID exactly (no extra spaces)
- Should be a long alphanumeric string (20+ characters)

## 🐛 Step 3: Common Issues & Solutions

### Issue 1: Port Mismatch
**Problem**: Dev server is running on a different port than configured
**Solution**: 
- Check what port your dev server is actually using
- Update your Atlassian OAuth app callback URL to match
- Or restart dev server on the expected port

### Issue 2: URL Path Mismatch
**Problem**: Callback URL has extra paths
**Solution**: 
- Atlassian callback URL should be just: `http://localhost:5174/`
- Not: `http://localhost:5174/login` or `http://localhost:5174/callback`

### Issue 3: OAuth App Not Enabled
**Problem**: OAuth app is in draft/disabled state
**Solution**: 
- In Atlassian Developer Console, ensure your app is "Published" or "Enabled"
- Some settings require republishing the app

### Issue 4: Scope Issues
**Problem**: Missing required scopes
**Solution**: 
- Ensure both `read:jira-user` and `read:jira-work` are added
- Save and republish the OAuth app if needed

## 🔄 Step 4: Reset and Test

If issues persist:

```javascript
// Clear all OAuth data and start fresh
window.oauthDebug.clearAll()

// Refresh the page and try again
location.reload()
```

## 📋 Quick Checklist

Before trying OAuth again, verify:

- [ ] Dev server is running and accessible
- [ ] Atlassian OAuth app callback URL matches exactly: `http://localhost:XXXX/`
- [ ] Client ID is correct (copy-paste from Atlassian console)
- [ ] OAuth app has required scopes: `read:jira-user`, `read:jira-work`
- [ ] OAuth app is enabled/published
- [ ] JIRA base URL is correct: `https://your-company.atlassian.net`

## 🔍 Advanced Debugging

Check the browser's Developer Console Network tab during OAuth:
1. Look for the POST request to `https://auth.atlassian.com/oauth/token`
2. Check the request payload matches your expectations
3. The response will show detailed error information

## 💡 Still Having Issues?

1. Try with a completely fresh OAuth app in Atlassian Developer Console
2. Double-check your JIRA instance URL and access permissions
3. Verify you have admin access to create OAuth apps
4. Test with a different browser or incognito mode

The enhanced error logging will now show detailed information about what's being sent to Atlassian, making it easier to identify the exact mismatch.