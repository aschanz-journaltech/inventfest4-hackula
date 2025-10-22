# 🚀 Quick Start - Deploy in 5 Minutes

## One-Line Deploy

```bash
cd terraform && cp terraform.tfvars.example terraform.tfvars && ./deploy.sh
```

## What Gets Created

```
┌─────────────────────────────────────────┐
│            Your Browser                  │
│         https://d123.cloudfront.net     │
└────────────┬────────────────────────────┘
             │ HTTPS (TLS 1.2+)
             ▼
┌─────────────────────────────────────────┐
│         CloudFront CDN                   │
│  • Global edge locations                │
│  • Automatic caching                    │
│  • Free SSL certificate                 │
│  • Gzip/Brotli compression             │
└────────────┬────────────────────────────┘
             │ Origin Access Identity
             ▼
┌─────────────────────────────────────────┐
│         S3 Bucket (Private)             │
│  • index.html                           │
│  • assets/index-abc123.js               │
│  • assets/index-xyz789.css              │
│  • Versioning enabled                   │
│  • Encrypted at rest                    │
└─────────────────────────────────────────┘
```

## Prerequisites

```bash
# 1. AWS CLI (check if installed)
aws --version

# If not installed:
# macOS: brew install awscli
# Linux: sudo apt install awscli
# Windows: https://aws.amazon.com/cli/

# 2. Configure AWS credentials
aws configure
# AWS Access Key ID: YOUR_KEY
# AWS Secret Access Key: YOUR_SECRET
# Default region: us-east-1
# Default output: json

# 3. Terraform (check if installed)
terraform --version

# If not installed:
# macOS: brew install terraform
# Linux: https://www.terraform.io/downloads
# Windows: https://www.terraform.io/downloads

# 4. Node.js (check if installed)
node --version
npm --version
```

## Step-by-Step

### 1️⃣ Configure

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` (optional - defaults work fine):
```hcl
aws_region = "us-east-1"
environment = "prod"
app_name = "story-point-sleuth"  # Change if bucket name taken
```

### 2️⃣ Deploy

```bash
./deploy.sh
```

**What happens:**
1. ✅ Checks requirements (AWS CLI, Terraform, npm)
2. ✅ Builds React app (`npm run build`)
3. ✅ Creates S3 bucket
4. ✅ Creates CloudFront distribution
5. ✅ Uploads files to S3
6. ✅ Shows your website URL

**Time**: ~5-10 minutes (CloudFront deployment takes longest)

### 3️⃣ Get URL

After deployment completes, you'll see:

```
═══════════════════════════════════════════════════════════
Website URL:
  https://d1234567890abc.cloudfront.net

OAuth Configuration:
  Update your Atlassian OAuth app with this redirect URI:
  https://d1234567890abc.cloudfront.net/oauth/callback
═══════════════════════════════════════════════════════════
```

### 4️⃣ Update OAuth

1. Go to https://developer.atlassian.com/console/myapps/
2. Open your OAuth 2.0 app
3. Update **Callback URL** to the one shown above
4. Save

### 5️⃣ Test

Open the website URL in your browser and test the OAuth flow!

## Common Commands

```bash
# Get website URL
terraform output website_url

# Get OAuth redirect URI
terraform output oauth_redirect_uri

# Update after code changes (quick)
npm run build && cd terraform && ./deploy.sh --skip-terraform

# View all infrastructure
terraform show

# Destroy everything
./deploy.sh --destroy
```

## Costs

**First 12 months (AWS Free Tier):**
- CloudFront: 1TB transfer + 10M requests FREE
- S3: 5GB storage + 20K GET FREE
- **Total: $0** ✨

**After first year (typical small site):**
- ~$10/month for 100K visitors
- See [README.md](README.md#cost-estimation) for details

## Troubleshooting

### "BucketAlreadyExists"
S3 bucket names are globally unique. Change `app_name` in `terraform.tfvars`:
```hcl
app_name = "sleuth-mycompany-prod"
```

### "403 Forbidden"
Wait 5-10 minutes for CloudFront deployment.

### "Changes not visible"
Invalidate CloudFront cache:
```bash
DIST_ID=$(terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

### "OAuth redirect fails"
Update Atlassian OAuth app with new redirect URI:
```bash
terraform output oauth_redirect_uri
```

## Custom Domain (Optional)

Want `sleuth.yourcompany.com` instead of `d123.cloudfront.net`?

### 1. Get Route53 Zone ID
```bash
aws route53 list-hosted-zones
```

### 2. Update `terraform.tfvars`
```hcl
enable_custom_domain = true
domain_name = "sleuth.yourcompany.com"
route53_zone_id = "Z1234567890ABC"
```

### 3. Deploy
```bash
./deploy.sh
```

**Wait 10-15 minutes** for:
- SSL certificate validation (automatic)
- DNS propagation

### 4. Update OAuth
```bash
terraform output oauth_redirect_uri
```

Update your Atlassian OAuth app with the new URL.

## File Structure

```
terraform/
├── main.tf                    # Provider config
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
├── s3.tf                      # S3 bucket
├── cloudfront.tf              # CDN
├── acm.tf                     # SSL certificate
├── route53.tf                 # DNS records
├── deploy.sh                  # Deployment script ⭐
├── terraform.tfvars.example   # Example config
└── README.md                  # Full documentation
```

## Next Steps

1. ✅ Deploy infrastructure
2. ✅ Update OAuth redirect URI
3. ✅ Test the application
4. 📖 Read [README.md](README.md) for advanced configuration
5. 🔄 Set up CI/CD (see [README.md](README.md#cicd-integration))

## Need Help?

- **Detailed docs**: [README.md](README.md)
- **Architecture**: [../.claude/claude.md](../.claude/claude.md)
- **OAuth setup**: [../OAUTH_TROUBLESHOOTING.md](../OAUTH_TROUBLESHOOTING.md)
- **Deployment guide**: [../DEPLOYMENT.md](../DEPLOYMENT.md)

---

**Ready to deploy? Run:**
```bash
cd terraform && ./deploy.sh
```
