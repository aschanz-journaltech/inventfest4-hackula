# GitHub Actions CI/CD Setup

This directory contains GitHub Actions workflows for automated deployment.

## Workflow: Deploy to AWS

**File:** [`deploy.yml`](deploy.yml)

**Trigger:** Pushes to `main` branch or manual dispatch

**What it does:**
1. ✅ Builds the React application
2. ✅ Runs Terraform to create/update infrastructure
3. ✅ Uploads files to S3
4. ✅ Invalidates CloudFront cache

## Setup Instructions

### Option 1: AWS Access Keys (Simple)

1. Create an IAM user with these policies:
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess`
   - `AmazonRoute53FullAccess` (if using custom domain)
   - `IAMReadOnlyAccess`

2. Generate access keys for the user

3. Add GitHub Secrets (Settings → Secrets → Actions):
   - `AWS_ACCESS_KEY_ID`: Your access key
   - `AWS_SECRET_ACCESS_KEY`: Your secret key

4. Add GitHub Variables (Settings → Secrets → Variables):
   - `AWS_REGION`: `us-east-1` (or your preferred region)
   - `ENVIRONMENT`: `prod`
   - `APP_NAME`: `story-point-sleuth`

### Option 2: AWS OIDC (Recommended - No Secrets)

More secure - no long-lived credentials stored in GitHub.

1. **Create IAM OIDC Provider in AWS:**

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

2. **Create IAM Role with Trust Policy:**

Create `github-actions-trust-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/YOUR_REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

Replace:
- `YOUR_ACCOUNT_ID` with your AWS account ID
- `YOUR_GITHUB_ORG/YOUR_REPO` with your repo (e.g., `mycompany/story-point-sleuth`)

Create the role:
```bash
aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --assume-role-policy-document file://github-actions-trust-policy.json
```

3. **Attach Policies:**

```bash
aws iam attach-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/CloudFrontFullAccess
```

4. **Add GitHub Secrets and Variables:**

Secrets:
- `AWS_ROLE_ARN`: `arn:aws:iam::YOUR_ACCOUNT_ID:role/GitHubActionsDeployRole`
- `ROUTE53_ZONE_ID`: Your Route53 zone ID (if using custom domain)

Variables:
- `USE_OIDC`: `true`
- `AWS_REGION`: `us-east-1`
- `ENVIRONMENT`: `prod`
- `APP_NAME`: `story-point-sleuth`
- `ENABLE_CUSTOM_DOMAIN`: `false` (or `true` if using custom domain)
- `DOMAIN_NAME`: (empty or your domain like `sleuth.example.com`)

## Configuration Variables

### Required Variables

| Name | Type | Description | Example |
|------|------|-------------|---------|
| `AWS_REGION` | Variable | AWS region | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | Secret | AWS access key (Option 1) | - |
| `AWS_SECRET_ACCESS_KEY` | Secret | AWS secret key (Option 1) | - |
| `AWS_ROLE_ARN` | Secret | IAM role ARN (Option 2) | `arn:aws:iam::123456789012:role/GitHubActionsDeployRole` |

### Optional Variables

| Name | Type | Description | Default |
|------|------|-------------|---------|
| `USE_OIDC` | Variable | Use OIDC auth | `false` |
| `ENVIRONMENT` | Variable | Environment name | `prod` |
| `APP_NAME` | Variable | Application name | `story-point-sleuth` |
| `ENABLE_CUSTOM_DOMAIN` | Variable | Enable custom domain | `false` |
| `DOMAIN_NAME` | Variable | Custom domain | (empty) |
| `ROUTE53_ZONE_ID` | Secret | Route53 zone ID | (empty) |

## Terraform State Management

For team collaboration, store Terraform state in S3:

1. **Create State Bucket:**

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

2. **Update `terraform/main.tf`:**

Uncomment the backend block:
```hcl
backend "s3" {
  bucket         = "my-terraform-state-bucket"
  key            = "story-point-sleuth/terraform.tfstate"
  region         = "us-east-1"
  encrypt        = true
  dynamodb_table = "terraform-state-lock"
}
```

3. **Migrate State:**

```bash
cd terraform
terraform init -migrate-state
```

## Manual Trigger

To manually trigger a deployment:

1. Go to **Actions** tab in GitHub
2. Select **Deploy to AWS** workflow
3. Click **Run workflow**
4. Select `main` branch
5. Click **Run workflow**

## Viewing Deployment Status

After pushing to `main`:

1. Go to **Actions** tab
2. Click on the latest workflow run
3. View logs for each step
4. See deployment summary at the bottom (website URL, OAuth URI)

## Troubleshooting

### "Error: Credentials could not be loaded"

Check that secrets are correctly set:
- For Access Keys: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- For OIDC: `AWS_ROLE_ARN` and `USE_OIDC=true`

### "Error: BucketAlreadyExists"

S3 bucket names are globally unique. Change `APP_NAME` variable:
```
APP_NAME=sleuth-mycompany-prod
```

### "Permission denied" errors

IAM role/user needs these permissions:
- `s3:*` on bucket
- `cloudfront:*`
- `route53:*` (if custom domain)
- `acm:*` (if custom domain)

### Workflow not triggering

1. Check `.github/workflows/deploy.yml` exists on `main` branch
2. Verify branch protection rules allow Actions
3. Check Actions are enabled (Settings → Actions → General)

## Workflow Badge

Add this to your README.md to show deployment status:

```markdown
![Deploy to AWS](https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/deploy.yml/badge.svg)
```

Replace `YOUR_ORG/YOUR_REPO` with your repository path.

## Cost Considerations

GitHub Actions includes:
- **Free tier**: 2,000 minutes/month for public repos
- **Free tier**: 500 MB storage

This workflow uses ~2-5 minutes per deployment.

AWS costs: See [../terraform/README.md](../terraform/README.md#cost-estimation)

## Security Best Practices

✅ Use OIDC instead of access keys (no long-lived credentials)
✅ Limit IAM permissions to minimum required
✅ Use separate AWS accounts for dev/staging/prod
✅ Enable branch protection on `main`
✅ Require pull request reviews before merging
✅ Use GitHub Environments for approval gates (optional)

## Advanced: Multiple Environments

To deploy to dev/staging/prod environments:

1. Create separate workflows:
   - `.github/workflows/deploy-dev.yml` (trigger on `develop` branch)
   - `.github/workflows/deploy-staging.yml` (trigger on `staging` branch)
   - `.github/workflows/deploy-prod.yml` (trigger on `main` branch)

2. Use different variable sets per environment:
   - `APP_NAME_DEV`, `APP_NAME_STAGING`, `APP_NAME_PROD`
   - `DOMAIN_NAME_DEV`, `DOMAIN_NAME_STAGING`, `DOMAIN_NAME_PROD`

3. Use separate Terraform workspaces or state files

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS OIDC Setup Guide](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [Terraform Cloud (Alternative)](https://www.terraform.io/cloud)
