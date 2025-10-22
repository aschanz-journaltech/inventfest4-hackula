# Story Point Sleuth - AWS Terraform Deployment

This directory contains Terraform configuration for deploying Story Point Sleuth as a static website on AWS using S3 and CloudFront.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌──────────────────────────┐
         │   Route53 (Optional)     │
         │   Custom Domain DNS      │
         └──────────┬───────────────┘
                    │
                    ▼
         ┌──────────────────────────┐
         │   CloudFront             │
         │   • Global CDN           │
         │   • HTTPS/SSL            │
         │   • Caching              │
         │   • SPA Routing          │
         └──────────┬───────────────┘
                    │
                    ▼
         ┌──────────────────────────┐
         │   S3 Bucket              │
         │   • Static files         │
         │   • Versioning           │
         │   • Encryption           │
         └──────────────────────────┘
```

## Features

✅ **S3 Static Website Hosting**
- Versioning enabled
- Server-side encryption (AES256)
- Private bucket with CloudFront OAI access
- Lifecycle rules for old versions

✅ **CloudFront CDN**
- Global edge locations
- HTTPS enforced (redirect HTTP → HTTPS)
- Custom error pages for SPA routing
- Optimized caching for static assets
- Gzip/Brotli compression

✅ **Optional Custom Domain**
- ACM SSL certificate (free)
- Route53 DNS records (A/AAAA)
- Automatic certificate validation

✅ **Security**
- S3 public access blocked
- Origin Access Identity (OAI)
- TLS 1.2+ only
- HTTPS-only viewer policy

✅ **Monitoring (Optional)**
- S3 access logs
- CloudFront access logs

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured with credentials
   ```bash
   aws configure
   ```
3. **Terraform** >= 1.0
   ```bash
   # Install via Homebrew (macOS)
   brew install terraform

   # Or download from https://www.terraform.io/downloads
   ```
4. **Node.js & npm** (for building the frontend)

## Quick Start

### 1. Configure Variables

Copy the example variables file and customize:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
# Basic configuration
aws_region  = "us-east-1"
environment = "prod"
app_name    = "story-point-sleuth"

# For CloudFront-only deployment (no custom domain)
enable_custom_domain = false
```

### 2. Deploy Using Script

The easiest way to deploy:

```bash
cd terraform
./deploy.sh
```

This script will:
1. Check requirements (AWS CLI, Terraform, npm)
2. Build the frontend (`npm run build`)
3. Initialize Terraform
4. Create infrastructure plan
5. Apply infrastructure changes
6. Upload files to S3
7. Invalidate CloudFront cache
8. Display website URL and OAuth redirect URI

### 3. Manual Deployment (Alternative)

If you prefer manual control:

```bash
# 1. Build frontend
cd ..
npm run build

# 2. Initialize Terraform
cd terraform
terraform init

# 3. Plan infrastructure
terraform plan -out=tfplan

# 4. Apply infrastructure
terraform apply tfplan

# 5. Deploy files to S3
S3_BUCKET=$(terraform output -raw s3_bucket_name)
aws s3 sync ../dist/ s3://$S3_BUCKET/ --delete

# 6. Invalidate CloudFront
DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

### 4. Get Website URL

```bash
terraform output website_url
```

### 5. Configure OAuth

Update your Atlassian OAuth app with the redirect URI:

```bash
terraform output oauth_redirect_uri
```

## Custom Domain Setup

To use a custom domain (e.g., `sleuth.example.com`):

### 1. Prerequisites

- Domain registered (AWS Route53 or external registrar)
- Route53 hosted zone created for your domain

### 2. Get Route53 Hosted Zone ID

```bash
aws route53 list-hosted-zones --query "HostedZones[?Name=='example.com.'].Id" --output text
```

### 3. Update `terraform.tfvars`

```hcl
enable_custom_domain = true
domain_name          = "sleuth.example.com"
route53_zone_id      = "Z1234567890ABC"  # Your hosted zone ID
```

### 4. Deploy

```bash
./deploy.sh
```

Terraform will:
1. Create ACM certificate in us-east-1
2. Add DNS validation records to Route53
3. Wait for certificate validation (~5-10 minutes)
4. Configure CloudFront with custom domain
5. Create Route53 A/AAAA records pointing to CloudFront

### 5. DNS Propagation

Wait 5-15 minutes for DNS to propagate, then visit:
```
https://sleuth.example.com
```

## Deployment Scripts

### Full Deployment

Deploy everything (build + infrastructure + files):

```bash
./deploy.sh
```

### Skip Frontend Build

If you've already built the frontend:

```bash
./deploy.sh --skip-build
```

### Skip Terraform Apply

Only deploy files (useful for quick updates):

```bash
./deploy.sh --skip-terraform
```

### Destroy Infrastructure

Remove all AWS resources:

```bash
./deploy.sh --destroy
```

⚠️ **Warning**: This will permanently delete your S3 bucket and all files!

## Manual File Deployment

To deploy only file changes (no infrastructure updates):

```bash
# Build frontend
npm run build

# Get bucket name
cd terraform
S3_BUCKET=$(terraform output -raw s3_bucket_name)
DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)

# Upload files with optimized caching
aws s3 sync ../dist/assets s3://$S3_BUCKET/assets/ \
  --delete \
  --cache-control "public,max-age=31536000,immutable"

aws s3 sync ../dist/ s3://$S3_BUCKET/ \
  --delete \
  --cache-control "public,max-age=3600" \
  --exclude "assets/*"

aws s3 cp ../dist/index.html s3://$S3_BUCKET/index.html \
  --cache-control "public,max-age=0,must-revalidate"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

## Terraform Commands Reference

```bash
# Initialize (first time, or after adding providers)
terraform init

# Validate configuration
terraform validate

# Format code
terraform fmt -recursive

# Plan changes
terraform plan

# Apply changes
terraform apply

# Show current state
terraform show

# List resources
terraform state list

# Get output values
terraform output
terraform output website_url
terraform output oauth_redirect_uri

# Destroy all resources
terraform destroy

# Import existing resource
terraform import aws_s3_bucket.website my-existing-bucket
```

## Outputs

After deployment, Terraform provides these outputs:

| Output | Description |
|--------|-------------|
| `website_url` | Full website URL (HTTPS) |
| `cloudfront_distribution_id` | CloudFront distribution ID |
| `cloudfront_domain_name` | CloudFront domain (e.g., d123.cloudfront.net) |
| `s3_bucket_name` | S3 bucket name |
| `oauth_redirect_uri` | OAuth callback URI for Atlassian |
| `deployment_command` | Command to deploy files |
| `invalidation_command` | Command to invalidate cache |

## File Structure

```
terraform/
├── main.tf                    # Provider configuration
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
├── s3.tf                      # S3 bucket configuration
├── cloudfront.tf              # CloudFront distribution
├── acm.tf                     # SSL certificate (optional)
├── route53.tf                 # DNS records (optional)
├── terraform.tfvars.example   # Example variables
├── deploy.sh                  # Deployment script
├── .gitignore                 # Git ignore file
└── README.md                  # This file
```

## Cost Estimation

Approximate monthly costs (us-east-1, 10K requests/month):

| Service | Cost | Notes |
|---------|------|-------|
| **S3 Storage** | $0.02/GB | First 50 TB |
| **S3 Requests** | $0.40/1M GET | First billion requests |
| **CloudFront Data Transfer** | $0.085/GB | First 10 TB (US/Europe) |
| **CloudFront Requests** | $0.01/10K | HTTP/HTTPS requests |
| **Route53 Hosted Zone** | $0.50/month | If using custom domain |
| **ACM Certificate** | **FREE** | For CloudFront |

**Example**: For a small site (1GB storage, 100K visitors/month):
- S3: ~$0.02 (storage) + $0.04 (requests) = **$0.06**
- CloudFront: ~$8.50 (transfer) + $1.00 (requests) = **$9.50**
- Route53: $0.50 (if using custom domain)
- **Total: ~$10/month**

💡 **Free Tier** (first 12 months):
- S3: 5GB storage, 20K GET, 2K PUT
- CloudFront: 1TB data transfer out, 10M HTTPS requests
- **First year: ~$0.50/month (Route53 only)**

## Caching Strategy

| Path | Cache Time | Why |
|------|-----------|-----|
| `/index.html` | 0 seconds | Always fetch latest (SPA routing) |
| `/assets/*` | 1 year | Immutable (Vite adds hash to filenames) |
| Other files | 1 hour | Reasonable balance |

CloudFront will cache files at edge locations, reducing load on S3 and improving global performance.

## Troubleshooting

### Issue: "Error creating S3 bucket: BucketAlreadyExists"

**Solution**: S3 bucket names are globally unique. Change `app_name` in `terraform.tfvars`:
```hcl
app_name = "my-unique-sleuth-app-123"
```

### Issue: "Certificate validation timeout"

**Solution**: DNS validation can take 5-30 minutes. Check Route53 for validation records:
```bash
aws route53 list-resource-record-sets --hosted-zone-id YOUR_ZONE_ID
```

### Issue: "403 Forbidden" when accessing website

**Possible causes**:
1. CloudFront distribution still deploying (wait 5-10 minutes)
2. S3 bucket policy incorrect (check OAI configuration)
3. Files not uploaded to S3

**Check deployment**:
```bash
# Check CloudFront status
aws cloudfront get-distribution --id YOUR_DIST_ID --query 'Distribution.Status'

# List S3 files
aws s3 ls s3://YOUR_BUCKET_NAME/
```

### Issue: "Index.html" downloads instead of displaying

**Solution**: Update MIME type:
```bash
aws s3 cp dist/index.html s3://YOUR_BUCKET/index.html \
  --content-type "text/html" \
  --cache-control "public,max-age=0,must-revalidate"
```

### Issue: Changes not visible on website

**Solution**: Invalidate CloudFront cache:
```bash
terraform output invalidation_command | bash
```

Or wait 1 hour for cache to expire.

### Issue: OAuth redirect fails after deployment

**Solution**: Update Atlassian OAuth app with new redirect URI:
```bash
terraform output oauth_redirect_uri
```
Go to https://developer.atlassian.com/console/myapps/ and update your app's redirect URI.

## Security Best Practices

✅ **Implemented**:
- S3 public access blocked
- CloudFront OAI for S3 access
- HTTPS enforced (TLS 1.2+)
- Server-side encryption
- Versioning enabled

📋 **Recommended**:
- Enable S3 access logging: `enable_access_logging = true`
- Use Terraform remote state in S3 with DynamoDB locking
- Implement AWS WAF for DDoS protection (optional)
- Set up CloudWatch alarms for errors
- Enable MFA delete on S3 bucket (manual)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy
        run: |
          cd terraform
          ./deploy.sh
```

## Remote State (Recommended for Teams)

For team collaboration, store Terraform state in S3:

### 1. Create State Bucket

```bash
aws s3 mb s3://my-terraform-state-bucket
aws s3api put-bucket-versioning \
  --bucket my-terraform-state-bucket \
  --versioning-configuration Status=Enabled

aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### 2. Update `main.tf`

Uncomment the backend configuration:
```hcl
backend "s3" {
  bucket         = "my-terraform-state-bucket"
  key            = "story-point-sleuth/terraform.tfstate"
  region         = "us-east-1"
  encrypt        = true
  dynamodb_table = "terraform-state-lock"
}
```

### 3. Migrate State

```bash
terraform init -migrate-state
```

## Updating the Application

### 1. Code Changes

```bash
# Make changes to React app
vim src/components/Dashboard.tsx

# Test locally
npm run dev
```

### 2. Deploy Changes

```bash
# Quick deploy (skip Terraform if infrastructure unchanged)
npm run build
cd terraform
./deploy.sh --skip-terraform
```

### 3. Verify

```bash
# Wait 1-2 minutes for CloudFront invalidation
terraform output website_url
# Open URL in browser
```

## Monitoring

### CloudWatch Metrics

CloudFront automatically provides metrics in CloudWatch:
- Requests
- Bytes downloaded
- Error rates (4xx, 5xx)

View in AWS Console:
```
CloudWatch → Metrics → CloudFront → Per-Distribution Metrics
```

### Cost Monitoring

Set up billing alerts:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name high-cloudfront-cost \
  --alarm-description "Alert when CloudFront cost exceeds $20" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 20 \
  --comparison-operator GreaterThanThreshold
```

## Cleanup

To completely remove all AWS resources:

```bash
cd terraform
./deploy.sh --destroy
```

⚠️ **This will**:
- Delete S3 bucket and all files
- Remove CloudFront distribution (can take 15-30 minutes)
- Delete ACM certificate
- Remove Route53 records
- **Cannot be undone!**

## Support

- **Terraform AWS Provider**: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- **AWS S3**: https://docs.aws.amazon.com/s3/
- **AWS CloudFront**: https://docs.aws.amazon.com/cloudfront/
- **Terraform**: https://www.terraform.io/docs

## License

Same as main project (see root LICENSE file).
