# JIRA OAuth Login Vite App

A modern React TypeScript application built with Vite that allows you to log in directly to JIRA using OAuth 2.0 authentication and view your projects and issues.

## Features

- 🔐 **Secure OAuth 2.0 Authentication** - Login using JIRA's official OAuth flow
- 🚀 **PKCE Security** - Implements Proof Key for Code Exchange for enhanced security
- 📊 **Project Overview** - View all accessible JIRA projects
- 🎫 **Issue Management** - Browse issues within selected projects
- 🎨 **Modern UI** - Clean, responsive design with JIRA-inspired styling
- ⚡ **Fast Development** - Powered by Vite for lightning-fast hot reload
- 🔒 **No Token Storage** - No need to manage API tokens manually

## Prerequisites

Before using this app, you'll need:

1. **JIRA Account** - Access to a JIRA instance (Atlassian Cloud)
2. **OAuth App Registration** - An OAuth 2.0 app registered in Atlassian Developer Console

### Setting Up OAuth App in Atlassian

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps)
2. Click "Create" and select "OAuth 2.0 integration"
3. Fill in your app details:
   - **Name**: Your app name (e.g., "JIRA Login App")
   - **App URL**: Your app URL (can be localhost for development)
4. Configure OAuth 2.0 (3LO):
   - **Callback URL**: `http://localhost:5173/` (for development)
   - **Scopes**: Add `read:jira-user` and `read:jira-work`
5. Copy the **Client ID** - you'll need this for the app

## Installation & Setup

1. **Clone or download** this repository
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the development server**:
   ```bash
   npm run dev
   ```
4. **Open your browser** and navigate to `http://localhost:5173`

## Usage

### Login Process

1. **Enter your JIRA Base URL**
   - Format: `https://your-company.atlassian.net`
   - This is your Atlassian JIRA Cloud instance

2. **Enter your OAuth Client ID**
   - The Client ID from your Atlassian OAuth app
   - This is public information and safe to use in the frontend

3. **Verify Redirect URI**
   - Should be `http://localhost:5173/` for development
   - Must match the callback URL in your OAuth app settings

4. **Click "Login with JIRA OAuth"**
   - You'll be redirected to Atlassian's secure login page
   - Authenticate with your JIRA credentials
   - Grant permissions to the app
   - You'll be redirected back to the app automatically

### After Login

Once authenticated, you can:

- **View your profile** information in the header
- **Select a project** from the dropdown menu
- **Browse issues** within the selected project
- **See issue details** including:
  - Issue key and summary
  - Status and priority
  - Assignee information
  - Creation and update dates

### Logout

Click the "Logout" button in the header to clear your session and return to the login screen.

## Security Features

🔒 **OAuth 2.0 with PKCE Security:**

- **No password storage** - Users authenticate directly with Atlassian
- **PKCE (Proof Key for Code Exchange)** - Enhanced security for public clients
- **Secure token handling** - Access tokens are handled securely
- **Automatic cleanup** - Session data is cleared on logout
- **Short-lived tokens** - Tokens expire automatically for security
- **Granular permissions** - Only request necessary scopes

## Technical Details

### Built With

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Axios** - HTTP client for API requests
- **Web Crypto API** - Built-in browser cryptographic functions
- **CSS3** - Modern styling with Flexbox and Grid

### OAuth 2.0 Flow

The app implements the OAuth 2.0 Authorization Code flow with PKCE:

1. **Authorization Request** - User is redirected to Atlassian OAuth server
2. **User Authentication** - User logs in with their JIRA credentials
3. **Authorization Grant** - User grants permissions to the app
4. **Callback Handling** - App receives authorization code
5. **Token Exchange** - Code is exchanged for access token using PKCE
6. **API Access** - Access token is used to make JIRA API calls

### Project Structure

```
src/
├── components/          # React components
│   ├── OAuthLogin.tsx  # OAuth 2.0 login form
│   ├── OAuthLogin.css  # OAuth login styles
│   ├── Dashboard.tsx   # Main dashboard after login
│   └── Dashboard.css   # Dashboard styles
├── services/           # API services
│   └── jiraApi.ts     # JIRA OAuth API integration
├── App.tsx            # Main application component
├── App.css            # Application styles
├── index.css          # Global styles
└── main.tsx           # Application entry point
```

### API Integration

The app uses the JIRA REST API v3 with OAuth 2.0 authentication:

- **OAuth Flow**: Atlassian OAuth 2.0 endpoints
- **User Info**: `GET /rest/api/3/myself`
- **Projects**: `GET /rest/api/3/project`
- **Issues**: `GET /rest/api/3/search`

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Environment Setup

For production deployment, you'll need to:

1. **Update OAuth settings** in Atlassian Developer Console
2. **Set production callback URL** (e.g., `https://yourdomain.com/`)
3. **Configure HTTPS** for secure OAuth flow
4. **Update redirect URI** in the app configuration

### Adding Features

To extend the application, you can:

1. **Add more JIRA endpoints** in `src/services/jiraApi.ts`
2. **Implement token refresh** for longer sessions
3. **Add more OAuth scopes** for additional permissions
4. **Create new components** for enhanced functionality
5. **Add state management** (Redux, Zustand, etc.) for complex state

## Troubleshooting

### Common Issues

1. **"OAuth state mismatch"**
   - Clear browser storage and try again
   - Ensure callback URL matches OAuth app settings

2. **"Failed to exchange token"**
   - Verify Client ID is correct
   - Check that redirect URI matches exactly
   - Ensure OAuth app has correct scopes

3. **"Not authenticated"**
   - Token may have expired
   - Try logging out and logging in again

4. **"CORS errors"**
   - Should not occur with proper OAuth flow
   - Verify using HTTPS in production

### OAuth App Configuration

Make sure your Atlassian OAuth app has:

- ✅ **Correct callback URL** (must match exactly)
- ✅ **Required scopes**: `read:jira-user`, `read:jira-work`
- ✅ **App is enabled** and published
- ✅ **Client ID is copied correctly**

### Browser Support

- Chrome/Edge (recommended) - Full support
- Firefox - Full support
- Safari - Full support (requires HTTPS in production)

## Production Deployment

For production deployment:

1. **Use HTTPS** - Required for OAuth 2.0 security
2. **Update callback URLs** in Atlassian Developer Console
3. **Set environment variables** for configuration
4. **Enable secure headers** and CSP policies
5. **Test OAuth flow** thoroughly before going live

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the MIT License.

---

**Note**: This application demonstrates OAuth 2.0 integration with JIRA. Always follow your organization's security policies and Atlassian's OAuth guidelines when deploying to production.
