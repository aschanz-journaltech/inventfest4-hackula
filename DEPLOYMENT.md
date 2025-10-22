# Deployment Guide - Story Point Sleuth

Quick reference for deploying Story Point Sleuth to AWS.

## 🚀 Quick Start (5 Minutes)

### Prerequisites

- AWS account with credentials configured (`aws configure`)
- Terraform installed (`brew install terraform`)
- Node.js and npm installed

### Deploy

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
./deploy.sh
```

That's it! The script will:
1. ✅ Build the React app
2. ✅ Create AWS infrastructure (S3 + CloudFront)
3. ✅ Upload files
4. ✅ Display your website URL

## 📋 Deployment Options

### Option 1: Automated Script (Recommended)

```bash
cd terraform
./deploy.sh
```

### Option 2: Manual Steps

```bash
# Build frontend
npm run build

# Deploy infrastructure
cd terraform
terraform init
terraform plan
terraform apply

# Upload files
S3_BUCKET=$(terraform output -raw s3_bucket_name)
aws s3 sync ../dist/ s3://$S3_BUCKET/ --delete

# Invalidate cache
DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

### Option 3: CI/CD (GitHub Actions)

See [terraform/README.md](terraform/README.md#cicd-integration) for GitHub Actions workflow.

## 🌐 Custom Domain Setup

To use your own domain (e.g., `sleuth.yourcompany.com`):

### 1. Get Route53 Zone ID

```bash
aws route53 list-hosted-zones --query "HostedZones[?Name=='yourcompany.com.'].Id" --output text
```

### 2. Update Configuration

Edit `terraform/terraform.tfvars`:

```hcl
enable_custom_domain = true
domain_name          = "sleuth.yourcompany.com"
route53_zone_id      = "Z1234567890ABC"  # From step 1
```

### 3. Deploy

```bash
cd terraform
./deploy.sh
```

Wait 10-15 minutes for:
- SSL certificate validation
- DNS propagation
- CloudFront deployment

### 4. Update OAuth

Update your Atlassian OAuth app redirect URI:

```bash
cd terraform
terraform output oauth_redirect_uri
```

Copy this URL to: https://developer.atlassian.com/console/myapps/

## 🔄 Updating After Code Changes

### Quick Update (Files Only)

```bash
npm run build
cd terraform
./deploy.sh --skip-terraform
```

This skips infrastructure changes and only updates website files (~30 seconds).

### Full Deployment

```bash
cd terraform
./deploy.sh
```

## 🔧 Configuration Variables

Edit `terraform/terraform.tfvars`:

```hcl
# Basic (required)
aws_region  = "us-east-1"
environment = "prod"
app_name    = "story-point-sleuth"

# Custom domain (optional)
enable_custom_domain = false
domain_name          = ""
route53_zone_id      = ""

# Performance (optional)
cloudfront_price_class = "PriceClass_100"  # US/Canada/Europe only

# Logging (optional)
enable_access_logging = false

# Tags (optional)
tags = {
  Team  = "Engineering"
  Owner = "your.email@company.com"
}
```

## 📊 Get Deployment Info

```bash
cd terraform

# Website URL
terraform output website_url

# OAuth redirect URI
terraform output oauth_redirect_uri

# CloudFront distribution ID
terraform output cloudfront_distribution_id

# All outputs
terraform output
```

## 🧹 Cleanup

Remove all AWS resources:

```bash
cd terraform
./deploy.sh --destroy
```

⚠️ **Warning**: This permanently deletes your S3 bucket and all files!

## 💰 Cost Estimate

For a typical small-scale deployment:

| Resource | Monthly Cost |
|----------|-------------|
| S3 Storage (1GB) | $0.02 |
| S3 Requests (100K) | $0.04 |
| CloudFront Data Transfer (100GB) | $8.50 |
| CloudFront Requests (1M) | $1.00 |
| Route53 (if custom domain) | $0.50 |
| **Total** | **~$10/month** |

**AWS Free Tier** (first 12 months):
- CloudFront: 1TB transfer + 10M requests
- S3: 5GB storage + 20K GET
- **Likely FREE for first year!** 🎉

## 🐛 Troubleshooting

### "BucketAlreadyExists" Error

S3 bucket names are globally unique. Change `app_name`:

```hcl
app_name = "sleuth-yourcompany-prod"
```

### Website Shows 403 Forbidden

Wait 5-10 minutes for CloudFront deployment to complete.

Check status:
```bash
DIST_ID=$(terraform output -raw cloudfront_distribution_id)
aws cloudfront get-distribution --id $DIST_ID --query 'Distribution.Status'
```

### Changes Not Visible

Invalidate CloudFront cache:
```bash
cd terraform
DIST_ID=$(terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

### OAuth Redirect Fails

Update Atlassian OAuth app with new redirect URI:
```bash
cd terraform
terraform output oauth_redirect_uri
```

## 📚 Resources

- [Detailed Terraform Documentation](terraform/README.md)
- [Architecture Documentation](.claude/claude.md)
- [OAuth Setup Guide](OAUTH_TROUBLESHOOTING.md)
- [AWS CloudFront Docs](https://docs.aws.amazon.com/cloudfront/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

## 🔐 Security Checklist

✅ S3 bucket is private (CloudFront OAI only)
✅ HTTPS enforced (TLS 1.2+)
✅ Server-side encryption enabled
✅ Versioning enabled
✅ No hardcoded credentials

Optional enhancements:
- Enable access logging: `enable_access_logging = true`
- Set up AWS WAF for DDoS protection
- Configure CloudWatch alarms
- Use Terraform remote state (S3 backend)

## 📞 Support

For AWS/Terraform issues:
- Check [terraform/README.md](terraform/README.md) for detailed troubleshooting
- Review AWS CloudFormation events for errors
- Check S3 bucket and CloudFront distribution in AWS Console

For application issues:
- See main [README.md](README.md)
- Review [OAUTH_TROUBLESHOOTING.md](OAUTH_TROUBLESHOOTING.md)

---

**Last Updated**: 2025-01-22
