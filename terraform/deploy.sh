#!/bin/bash
# Deployment script for Story Point Sleuth to AWS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$PROJECT_ROOT/dist"

# Functions
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

check_requirements() {
    print_info "Checking requirements..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not found. Install: https://aws.amazon.com/cli/"
        exit 1
    fi

    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform not found. Install: https://www.terraform.io/downloads"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm not found. Install Node.js: https://nodejs.org/"
        exit 1
    fi

    print_success "All requirements met"
}

check_aws_credentials() {
    print_info "Checking AWS credentials..."

    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Run: aws configure"
        exit 1
    fi

    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    AWS_USER=$(aws sts get-caller-identity --query Arn --output text)
    print_success "Authenticated as: $AWS_USER (Account: $AWS_ACCOUNT)"
}

build_frontend() {
    print_info "Building frontend..."

    cd "$PROJECT_ROOT"

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies..."
        npm install
    fi

    # Run build
    print_info "Running production build..."
    npm run build

    # Check build output
    if [ ! -d "$DIST_DIR" ]; then
        print_error "Build failed: dist/ directory not found"
        exit 1
    fi

    print_success "Frontend built successfully"
}

terraform_init() {
    print_info "Initializing Terraform..."

    cd "$SCRIPT_DIR"

    terraform init

    print_success "Terraform initialized"
}

terraform_plan() {
    print_info "Planning Terraform changes..."

    cd "$SCRIPT_DIR"

    terraform plan -out=tfplan

    print_success "Terraform plan created"
}

terraform_apply() {
    print_info "Applying Terraform changes..."

    cd "$SCRIPT_DIR"

    # Check if plan exists
    if [ ! -f "tfplan" ]; then
        print_warning "No plan file found. Creating plan first..."
        terraform_plan
    fi

    # Apply
    terraform apply tfplan

    # Clean up plan file
    rm -f tfplan

    print_success "Infrastructure deployed"
}

deploy_files() {
    print_info "Deploying files to S3..."

    cd "$SCRIPT_DIR"

    # Get S3 bucket name from Terraform output
    S3_BUCKET=$(terraform output -raw s3_bucket_name)
    DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)

    if [ -z "$S3_BUCKET" ]; then
        print_error "Could not get S3 bucket name from Terraform"
        exit 1
    fi

    print_info "Deploying to bucket: $S3_BUCKET"

    # Sync static assets with long cache (1 year)
    print_info "Uploading static assets..."
    aws s3 sync "$DIST_DIR/assets" "s3://$S3_BUCKET/assets/" \
        --delete \
        --cache-control "public,max-age=31536000,immutable" \
        --exclude "*.html"

    # Upload other files with short cache
    print_info "Uploading other files..."
    aws s3 sync "$DIST_DIR/" "s3://$S3_BUCKET/" \
        --delete \
        --cache-control "public,max-age=3600" \
        --exclude "assets/*"

    # Upload index.html with no cache
    print_info "Uploading index.html..."
    aws s3 cp "$DIST_DIR/index.html" "s3://$S3_BUCKET/index.html" \
        --cache-control "public,max-age=0,must-revalidate" \
        --content-type "text/html"

    print_success "Files deployed to S3"

    # Invalidate CloudFront cache
    print_info "Invalidating CloudFront cache..."
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$DISTRIBUTION_ID" \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text)

    print_success "CloudFront invalidation created: $INVALIDATION_ID"
}

show_outputs() {
    print_info "Deployment complete! 🎉"

    cd "$SCRIPT_DIR"

    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo ""

    # Get outputs
    WEBSITE_URL=$(terraform output -raw website_url)
    OAUTH_URI=$(terraform output -raw oauth_redirect_uri)
    DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)

    echo -e "${GREEN}Website URL:${NC}"
    echo "  $WEBSITE_URL"
    echo ""

    echo -e "${YELLOW}OAuth Configuration:${NC}"
    echo "  Update your Atlassian OAuth app with this redirect URI:"
    echo "  $OAUTH_URI"
    echo ""

    echo -e "${BLUE}CloudFront Distribution:${NC}"
    echo "  ID: $DISTRIBUTION_ID"
    echo ""

    echo "═══════════════════════════════════════════════════════════"
    echo ""

    print_info "Next steps:"
    echo "  1. Open $WEBSITE_URL in your browser"
    echo "  2. Update OAuth redirect URI in Atlassian Developer Console"
    echo "  3. Test the OAuth flow"
}

# Main execution
main() {
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  Story Point Sleuth - AWS Deployment"
    echo "═══════════════════════════════════════════════════════════"
    echo ""

    # Parse arguments
    SKIP_BUILD=false
    SKIP_TERRAFORM=false
    DESTROY=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-terraform)
                SKIP_TERRAFORM=true
                shift
                ;;
            --destroy)
                DESTROY=true
                shift
                ;;
            --help)
                echo "Usage: ./deploy.sh [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-build       Skip frontend build"
                echo "  --skip-terraform   Skip Terraform apply"
                echo "  --destroy          Destroy infrastructure"
                echo "  --help             Show this help message"
                echo ""
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Run './deploy.sh --help' for usage"
                exit 1
                ;;
        esac
    done

    # Destroy mode
    if [ "$DESTROY" = true ]; then
        print_warning "Destroying infrastructure..."
        cd "$SCRIPT_DIR"
        terraform destroy
        print_success "Infrastructure destroyed"
        exit 0
    fi

    # Normal deployment
    check_requirements
    check_aws_credentials

    if [ "$SKIP_BUILD" = false ]; then
        build_frontend
    else
        print_warning "Skipping frontend build"
    fi

    if [ "$SKIP_TERRAFORM" = false ]; then
        terraform_init
        terraform_plan
        terraform_apply
    else
        print_warning "Skipping Terraform apply"
    fi

    deploy_files
    show_outputs
}

# Run main function
main "$@"
