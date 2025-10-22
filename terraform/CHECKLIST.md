# Pre-Deployment Checklist

Use this checklist before deploying Story Point Sleuth to AWS.

## ✅ Prerequisites

### AWS Account Setup
- [ ] AWS account created
- [ ] IAM user with appropriate permissions
- [ ] AWS CLI installed (`aws --version`)
- [ ] AWS credentials configured (`aws configure`)
- [ ] Can list S3 buckets (`aws s3 ls`)

### Development Tools
- [ ] Terraform installed (`terraform --version`)
- [ ] Node.js installed (`node --version` >= 18)
- [ ] npm installed (`npm --version`)
- [ ] Git installed (`git --version`)

### Application
- [ ] Frontend builds successfully (`npm run build`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Application tested locally (`npm run dev`)

## 📋 Pre-Deployment Configuration

### Terraform Variables
- [ ] Copied `terraform.tfvars.example` to `terraform.tfvars`
- [ ] Set `aws_region` (e.g., `us-east-1`)
- [ ] Set `environment` (e.g., `prod`, `staging`, `dev`)
- [ ] Set `app_name` (must be globally unique for S3)
- [ ] Reviewed `cloudfront_price_class` (cost vs performance)

### Custom Domain (If Using)
- [ ] Domain registered
- [ ] Route53 hosted zone created
- [ ] Set `enable_custom_domain = true`
- [ ] Set `domain_name` (e.g., `sleuth.example.com`)
- [ ] Set `route53_zone_id` (from `aws route53 list-hosted-zones`)
- [ ] DNS nameservers updated (if external registrar)

### Security Review
- [ ] No secrets in code
- [ ] `.gitignore` includes `*.tfvars`
- [ ] Using latest Terraform version
- [ ] IAM permissions follow least privilege
- [ ] S3 bucket will be private (✓ default)
- [ ] HTTPS enforced (✓ default)

## 🚀 Deployment Steps

### 1. Initial Validation
- [ ] `cd terraform`
- [ ] `terraform fmt` (format code)
- [ ] `terraform validate` (after `terraform init`)

### 2. Build Application
- [ ] `cd ..` (back to project root)
- [ ] `npm install` (if dependencies changed)
- [ ] `npm run build`
- [ ] Verify `dist/` directory exists
- [ ] Verify `dist/index.html` exists

### 3. Deploy Infrastructure
- [ ] `cd terraform`
- [ ] `terraform init`
- [ ] `terraform plan` (review changes)
- [ ] Verify no unexpected resource deletions
- [ ] `terraform apply`
- [ ] Wait for completion (~5-10 minutes)

### 4. Deploy Files
- [ ] Run deployment command from `terraform output`
- [ ] Verify files uploaded to S3
- [ ] Invalidate CloudFront cache
- [ ] Wait for invalidation completion (~1-2 minutes)

### 5. Verify Deployment
- [ ] Get website URL: `terraform output website_url`
- [ ] Open website in browser
- [ ] Verify HTTPS works
- [ ] Check console for errors (F12)
- [ ] Verify all assets load correctly

## 🔐 OAuth Configuration

### Atlassian Developer Console
- [ ] Get OAuth redirect URI: `terraform output oauth_redirect_uri`
- [ ] Log in to https://developer.atlassian.com/console/myapps/
- [ ] Open your OAuth 2.0 app
- [ ] Update Callback URL with new redirect URI
- [ ] Save changes

### Test OAuth Flow
- [ ] Click "Login" on deployed site
- [ ] Enter JIRA URL, Client ID, Client Secret
- [ ] Click "Authorize"
- [ ] Redirects to Atlassian
- [ ] Authorize app
- [ ] Redirects back to app
- [ ] Dashboard loads successfully
- [ ] Can select project
- [ ] Issues load correctly

## 📊 Post-Deployment Validation

### Functionality Tests
- [ ] OAuth login works
- [ ] Project selection works
- [ ] Issues load (check multiple projects)
- [ ] Charts render correctly
  - [ ] Boxplot
  - [ ] Scatterplot
  - [ ] Histogram
- [ ] Performance boxes show correct data
- [ ] Time filters work (All, 3M, 1M, 1W, 1D, 1H)
- [ ] Dark mode toggle works
- [ ] Modal views work (click charts)
- [ ] JIRA issue links work (click issue keys)
- [ ] Logout works
- [ ] Re-login works

### Browser Testing
- [ ] Chrome/Edge (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Mobile browser (iOS Safari or Android Chrome)

### Performance Checks
- [ ] Initial page load < 3 seconds
- [ ] CloudFront cache hit ratio > 80% (after some traffic)
- [ ] No console errors
- [ ] No 404s in Network tab
- [ ] Lighthouse score > 90 (optional)

## 💰 Cost Monitoring

### AWS Console Checks
- [ ] Check S3 bucket size (S3 console)
- [ ] Check CloudFront data transfer (CloudFront console)
- [ ] Review Cost Explorer for unexpected charges
- [ ] Set up billing alerts (optional but recommended)

### Billing Alert (Recommended)
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name story-point-sleuth-cost-alert \
  --alarm-description "Alert when monthly cost exceeds $20" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 20 \
  --comparison-operator GreaterThanThreshold
```

## 🔍 Troubleshooting Checklist

### If Website Returns 403
- [ ] CloudFront distribution status is "Deployed"
- [ ] S3 bucket policy allows CloudFront OAI
- [ ] Files uploaded to S3 bucket
- [ ] Wait 5-10 minutes for propagation

### If OAuth Fails
- [ ] Redirect URI exactly matches Atlassian app config
- [ ] No trailing slash differences
- [ ] HTTPS (not HTTP)
- [ ] Client ID and Secret are correct
- [ ] OAuth app has correct permissions

### If Changes Not Visible
- [ ] CloudFront cache invalidated
- [ ] Browser cache cleared (Ctrl+Shift+R / Cmd+Shift+R)
- [ ] Correct distribution ID used
- [ ] Files actually uploaded to S3

### If Custom Domain Doesn't Work
- [ ] Certificate validation completed (10-30 minutes)
- [ ] Route53 records created (A and AAAA)
- [ ] DNS propagated (check with `dig` or `nslookup`)
- [ ] CloudFront alternate domain names configured

## 📝 Documentation

### Update Documentation
- [ ] Update README.md with deployment URL
- [ ] Document any custom configuration
- [ ] Add OAuth setup instructions
- [ ] Update team wiki/docs

### Team Communication
- [ ] Announce deployment to team
- [ ] Share website URL
- [ ] Share OAuth configuration steps
- [ ] Document any known issues

## 🔄 CI/CD Setup (Optional)

### GitHub Actions
- [ ] `.github/workflows/deploy.yml` exists
- [ ] AWS credentials configured (secrets)
- [ ] Test workflow with manual trigger
- [ ] Verify automated deployment works

### Future Updates
- [ ] Document update process
- [ ] Set up staging environment (optional)
- [ ] Configure monitoring/alerting
- [ ] Plan backup/disaster recovery

## ✨ Production Ready Checklist

### Security
- [ ] S3 bucket is private
- [ ] CloudFront uses HTTPS only
- [ ] TLS 1.2+ enforced
- [ ] No secrets in version control
- [ ] IAM follows least privilege

### Performance
- [ ] CloudFront caching configured
- [ ] Static assets have long cache times
- [ ] index.html has short cache time
- [ ] Compression enabled (gzip/brotli)

### Reliability
- [ ] S3 versioning enabled
- [ ] Multiple CloudFront edge locations
- [ ] Error pages configured
- [ ] SPA routing works

### Observability
- [ ] Can view CloudFront metrics
- [ ] Can check S3 access logs (if enabled)
- [ ] Billing alerts configured
- [ ] Deployment process documented

## 🎉 Launch!

Once all checkboxes are complete:

- [ ] Final smoke test
- [ ] Announce to stakeholders
- [ ] Monitor for first 24 hours
- [ ] Celebrate successful deployment! 🚀

---

## Quick Reference Commands

```bash
# Get website URL
terraform output website_url

# Get OAuth redirect URI
terraform output oauth_redirect_uri

# View all outputs
terraform output

# Invalidate CloudFront cache
DIST_ID=$(terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"

# Check CloudFront status
DIST_ID=$(terraform output -raw cloudfront_distribution_id)
aws cloudfront get-distribution --id $DIST_ID --query 'Distribution.Status'

# List S3 files
S3_BUCKET=$(terraform output -raw s3_bucket_name)
aws s3 ls s3://$S3_BUCKET/ --recursive

# Update after code changes
npm run build && cd terraform && ./deploy.sh --skip-terraform
```

## Support Resources

- [Quick Start Guide](QUICK_START.md)
- [Detailed README](README.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [Architecture Docs](../.claude/claude.md)
- [OAuth Troubleshooting](../OAUTH_TROUBLESHOOTING.md)

---

**Remember:** Always test in a development environment first before deploying to production!
