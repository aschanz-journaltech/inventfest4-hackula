# Quick Update Guide

Fast deployments for code changes without touching infrastructure.

## 🚀 One-Line Update

```bash
./quick-update.sh
```

**OR** using npm:

```bash
npm run deploy:quick
```

## What It Does

```
1. ✓ Builds React app (npm run build)
2. ✓ Uploads files to S3
   - Assets: 1-year cache (immutable)
   - HTML: No cache (always fresh)
   - Other: 1-hour cache
3. ✓ Invalidates CloudFront cache
4. ✓ Shows website URL

Time: ~30-60 seconds ⚡
```

## When to Use

**Use `quick-update.sh` when:**
- ✅ Changed React components
- ✅ Modified CSS styles
- ✅ Updated TypeScript code
- ✅ Fixed bugs in frontend
- ✅ Changed text/content

**Use `terraform/deploy.sh` when:**
- ⚙️ Changed infrastructure (Terraform files)
- ⚙️ Updated CloudFront settings
- ⚙️ Changed S3 bucket configuration
- ⚙️ Added custom domain
- ⚙️ First deployment

## Usage Options

### Standard Update (Recommended)
```bash
./quick-update.sh
```
Builds + uploads + invalidates cache (~60 seconds)

### Skip Build (If Already Built)
```bash
./quick-update.sh --skip-build
```
Only uploads existing `dist/` folder (~15 seconds)

### Skip Cache Invalidation (Slower but Free)
```bash
./quick-update.sh --skip-invalidation
```
Changes visible in ~1 hour, no CloudFront invalidation cost

### Dry Run (Preview)
```bash
./quick-update.sh --dry-run
```
Shows what would be uploaded without actually uploading

### Help
```bash
./quick-update.sh --help
```

## NPM Scripts

Added to [package.json](package.json):

```bash
# Full deployment (infrastructure + files)
npm run deploy

# Quick update (files only)
npm run deploy:quick

# Quick update with existing build
npm run deploy:skip-build

# Preview changes without uploading
npm run deploy:dry-run
```

## Step-by-Step Workflow

### 1. Make Changes
```bash
# Edit your React components
vim src/components/Dashboard.tsx

# Test locally
npm run dev
# Open http://localhost:5173
```

### 2. Quick Update
```bash
# Build and deploy
./quick-update.sh
```

### 3. Verify
```bash
# Wait 1-2 minutes
# Open your website URL
# Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

## Example Output

```
═══════════════════════════════════════════════════════════
  Story Point Sleuth - Quick Update
═══════════════════════════════════════════════════════════

ℹ Checking requirements...
✓ All requirements met
ℹ Checking AWS credentials...
✓ Authenticated as: arn:aws:iam::123456789012:user/deploy
ℹ Building frontend...
✓ Frontend built successfully
ℹ Build size: 1.2M
ℹ Getting deployment configuration...
✓ Deployment target: https://d1234567890abc.cloudfront.net
ℹ Uploading files to S3...
ℹ Uploading static assets (immutable cache)...
✓ Uploaded 8 asset file(s)
ℹ Uploading other files...
ℹ Uploading index.html (no cache)...
✓ All files uploaded to S3
ℹ Invalidating CloudFront cache...
✓ CloudFront invalidation created: I2EXAMPLE
ℹ Changes will be visible in 1-2 minutes

═══════════════════════════════════════════════════════════
  Quick Update Complete! 🚀
═══════════════════════════════════════════════════════════

Website URL:
  https://d1234567890abc.cloudfront.net

S3 Bucket:
  story-point-sleuth-prod-website

CloudFront Distribution:
  E1234567890ABC

═══════════════════════════════════════════════════════════

ℹ Next steps:
  1. Wait 1-2 minutes for CloudFront invalidation
  2. Open https://d1234567890abc.cloudfront.net in your browser
  3. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R) to clear local cache
  4. Test your changes
```

## Performance Comparison

| Method | Infrastructure | Build | Upload | Cache | Total Time |
|--------|---------------|-------|--------|-------|------------|
| `terraform/deploy.sh` | ✓ Creates/Updates | ✓ | ✓ | ✓ | ~5-10 min |
| `quick-update.sh` | ✗ Skipped | ✓ | ✓ | ✓ | ~60 sec |
| `quick-update.sh --skip-build` | ✗ | ✗ | ✓ | ✓ | ~15 sec |
| `quick-update.sh --skip-invalidation` | ✗ | ✓ | ✓ | ✗ | ~45 sec |

## Troubleshooting

### "Terraform state not found"
**Problem**: Infrastructure not deployed yet

**Solution**:
```bash
cd terraform
./deploy.sh
```

### "AWS credentials not configured"
**Problem**: AWS CLI not set up

**Solution**:
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Region: us-east-1
# Output: json
```

### "Build failed"
**Problem**: TypeScript or ESLint errors

**Solution**:
```bash
# Check for errors
npm run lint
npm run build

# Fix errors and try again
```

### "Changes not visible"
**Problem**: Browser cache or CloudFront not invalidated

**Solution**:
```bash
# Hard refresh in browser
# Windows/Linux: Ctrl + Shift + R
# Mac: Cmd + Shift + R

# Or clear browser cache
# Chrome: Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
```

### "InvalidationBatchAlreadyExists"
**Problem**: Previous invalidation still in progress

**Solution**:
```bash
# Wait 2-3 minutes for previous invalidation to complete
# Or skip invalidation:
./quick-update.sh --skip-invalidation
```

## Cost Considerations

### CloudFront Invalidations
- **First 1,000 paths/month**: FREE
- **Additional paths**: $0.005 per path

Each `quick-update.sh` run creates **1 invalidation** (`/*` = 1 path).

**Monthly cost**:
- 1-1000 updates: **$0** (free tier)
- 1001-2000 updates: **$5**
- 2000+ updates: $0.005 per update

**Tip**: Use `--skip-invalidation` for non-urgent updates to avoid costs.

## Advanced Usage

### Update Specific Files Only
```bash
# Get bucket name
cd terraform
S3_BUCKET=$(terraform output -raw s3_bucket_name)

# Upload single file
aws s3 cp dist/index.html s3://$S3_BUCKET/index.html \
  --cache-control "public,max-age=0,must-revalidate"

# Invalidate specific path
DIST_ID=$(terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/index.html"
```

### Watch Mode + Auto Deploy
```bash
# Terminal 1: Watch for changes and build
npm run dev

# Terminal 2: Deploy on file changes (requires fswatch)
fswatch -o dist/ | xargs -n1 -I{} ./quick-update.sh --skip-build
```

### Deploy from CI/CD
```bash
# GitHub Actions, GitLab CI, etc.
- name: Quick Deploy
  run: |
    npm run build
    ./quick-update.sh --skip-build
```

## Comparison with Full Deployment

### Full Deployment (`terraform/deploy.sh`)
```
✓ Creates/updates infrastructure
✓ Manages S3 buckets
✓ Configures CloudFront
✓ Sets up SSL certificates
✓ Configures DNS (if custom domain)
✓ Builds frontend
✓ Uploads files
✓ Invalidates cache

Time: 5-10 minutes (first run)
      2-5 minutes (updates)
Use: Infrastructure changes
```

### Quick Update (`quick-update.sh`)
```
✗ Skips infrastructure (uses existing)
✓ Builds frontend
✓ Uploads files
✓ Invalidates cache

Time: 30-60 seconds
Use: Code changes only
```

## Best Practices

1. **Test Locally First**
   ```bash
   npm run dev
   # Test at http://localhost:5173
   ```

2. **Lint Before Deploying**
   ```bash
   npm run lint
   # Fix any errors
   ```

3. **Use Dry Run for Large Changes**
   ```bash
   ./quick-update.sh --dry-run
   # Review what will be uploaded
   ```

4. **Monitor CloudFront Invalidations**
   ```bash
   cd terraform
   DIST_ID=$(terraform output -raw cloudfront_distribution_id)
   aws cloudfront list-invalidations --distribution-id $DIST_ID
   ```

5. **Check Deployment in Browser**
   - Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
   - Check console for errors (F12)
   - Test OAuth flow
   - Verify charts render

## Related Documentation

- [Full Deployment Guide](DEPLOYMENT.md)
- [Terraform Documentation](terraform/README.md)
- [Quick Start](terraform/QUICK_START.md)
- [Pre-Deployment Checklist](terraform/CHECKLIST.md)

## Quick Reference

```bash
# Make changes
vim src/components/Dashboard.tsx

# Test locally
npm run dev

# Deploy changes
./quick-update.sh

# Or using npm
npm run deploy:quick

# Wait 1-2 minutes, then visit your website
# Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

---

**Speed up your deployments!** 🚀

For infrastructure changes, use [terraform/deploy.sh](terraform/deploy.sh)

For code changes only, use [quick-update.sh](quick-update.sh)
