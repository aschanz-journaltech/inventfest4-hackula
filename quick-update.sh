#!/bin/bash
# Quick Update Script - Deploy code changes without touching infrastructure
# Use this after making changes to React components, CSS, or other frontend code

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
TERRAFORM_DIR="$SCRIPT_DIR/terraform"

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

print_header() {
    echo -e "${CYAN}${1}${NC}"
}

spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    while ps -p $pid > /dev/null 2>&1; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

check_requirements() {
    print_info "Checking requirements..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not found. Install: https://aws.amazon.com/cli/"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm not found. Install Node.js: https://nodejs.org/"
        exit 1
    fi

    # Check if terraform directory exists
    if [ ! -d "$TERRAFORM_DIR" ]; then
        print_error "Terraform directory not found: $TERRAFORM_DIR"
        exit 1
    fi

    # Check if terraform state exists
    if [ ! -f "$TERRAFORM_DIR/terraform.tfstate" ] && [ ! -f "$TERRAFORM_DIR/.terraform/terraform.tfstate" ]; then
        print_error "Terraform state not found. Run './terraform/deploy.sh' first to create infrastructure."
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

    AWS_USER=$(aws sts get-caller-identity --query Arn --output text)
    print_success "Authenticated as: $AWS_USER"
}

build_frontend() {
    print_info "Building frontend..."

    cd "$SCRIPT_DIR"

    # Clean dist directory
    if [ -d "$DIST_DIR" ]; then
        rm -rf "$DIST_DIR"
    fi

    # Run build
    if npm run build > /tmp/build.log 2>&1; then
        print_success "Frontend built successfully"
    else
        print_error "Build failed. Check logs:"
        cat /tmp/build.log
        exit 1
    fi

    # Verify build output
    if [ ! -f "$DIST_DIR/index.html" ]; then
        print_error "Build failed: index.html not found in dist/"
        exit 1
    fi

    # Calculate build size
    local build_size=$(du -sh "$DIST_DIR" | cut -f1)
    print_info "Build size: $build_size"
}

get_terraform_outputs() {
    print_info "Getting deployment configuration..."

    cd "$TERRAFORM_DIR"

    # Check if Terraform is available
    if ! command -v terraform &> /dev/null; then
        print_warning "Terraform not found. Trying to get outputs from state file..."
        # Could parse terraform.tfstate here, but for now just error
        print_error "Please install Terraform to continue."
        exit 1
    fi

    # Get outputs
    S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null)
    DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null)
    WEBSITE_URL=$(terraform output -raw website_url 2>/dev/null)

    if [ -z "$S3_BUCKET" ] || [ -z "$DISTRIBUTION_ID" ]; then
        print_error "Could not get Terraform outputs. Infrastructure may not be deployed."
        exit 1
    fi

    print_success "Deployment target: $WEBSITE_URL"
}

deploy_to_s3() {
    print_info "Uploading files to S3..."

    cd "$SCRIPT_DIR"

    # Upload assets with long cache (immutable, hashed filenames)
    if [ -d "$DIST_DIR/assets" ]; then
        print_info "Uploading static assets (immutable cache)..."

        local asset_count=$(find "$DIST_DIR/assets" -type f | wc -l | tr -d ' ')

        aws s3 sync "$DIST_DIR/assets" "s3://$S3_BUCKET/assets/" \
            --delete \
            --cache-control "public,max-age=31536000,immutable" \
            --no-progress \
            2>&1 | grep -v "upload:" || true

        print_success "Uploaded $asset_count asset file(s)"
    fi

    # Upload other files (excluding assets and index.html)
    print_info "Uploading other files..."

    local file_count=$(find "$DIST_DIR" -maxdepth 1 -type f | wc -l | tr -d ' ')

    aws s3 sync "$DIST_DIR/" "s3://$S3_BUCKET/" \
        --delete \
        --cache-control "public,max-age=3600" \
        --exclude "assets/*" \
        --exclude "index.html" \
        --no-progress \
        2>&1 | grep -v "upload:" || true

    # Upload index.html with no cache (always fetch latest for SPA routing)
    print_info "Uploading index.html (no cache)..."

    aws s3 cp "$DIST_DIR/index.html" "s3://$S3_BUCKET/index.html" \
        --cache-control "public,max-age=0,must-revalidate" \
        --content-type "text/html" \
        --no-progress

    print_success "All files uploaded to S3"
}

invalidate_cloudfront() {
    print_info "Invalidating CloudFront cache..."

    # Create invalidation
    INVALIDATION_OUTPUT=$(aws cloudfront create-invalidation \
        --distribution-id "$DISTRIBUTION_ID" \
        --paths "/*" \
        --output json 2>&1)

    if [ $? -eq 0 ]; then
        INVALIDATION_ID=$(echo "$INVALIDATION_OUTPUT" | grep -o '"Id": "[^"]*"' | cut -d'"' -f4)
        print_success "CloudFront invalidation created: $INVALIDATION_ID"
        print_info "Changes will be visible in 1-2 minutes"
    else
        print_warning "CloudFront invalidation failed (non-critical)"
        print_info "Changes will be visible after cache expires (~1 hour)"
    fi
}

show_summary() {
    print_header ""
    print_header "═══════════════════════════════════════════════════════════"
    print_header "  Quick Update Complete! 🚀"
    print_header "═══════════════════════════════════════════════════════════"
    echo ""

    echo -e "${GREEN}Website URL:${NC}"
    echo "  $WEBSITE_URL"
    echo ""

    echo -e "${BLUE}S3 Bucket:${NC}"
    echo "  $S3_BUCKET"
    echo ""

    echo -e "${BLUE}CloudFront Distribution:${NC}"
    echo "  $DISTRIBUTION_ID"
    echo ""

    print_header "═══════════════════════════════════════════════════════════"
    echo ""

    print_info "Next steps:"
    echo "  1. Wait 1-2 minutes for CloudFront invalidation"
    echo "  2. Open $WEBSITE_URL in your browser"
    echo "  3. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R) to clear local cache"
    echo "  4. Test your changes"
    echo ""

    print_info "Tip: To skip CloudFront invalidation (faster but may take up to 1 hour):"
    echo "      ./quick-update.sh --skip-invalidation"
    echo ""
}

# Main execution
main() {
    echo ""
    print_header "═══════════════════════════════════════════════════════════"
    print_header "  Story Point Sleuth - Quick Update"
    print_header "═══════════════════════════════════════════════════════════"
    echo ""

    # Parse arguments
    SKIP_BUILD=false
    SKIP_INVALIDATION=false
    DRY_RUN=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-invalidation)
                SKIP_INVALIDATION=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help|-h)
                echo "Usage: ./quick-update.sh [OPTIONS]"
                echo ""
                echo "Quick update script for deploying code changes without touching infrastructure."
                echo ""
                echo "Options:"
                echo "  --skip-build          Skip frontend build (use existing dist/)"
                echo "  --skip-invalidation   Skip CloudFront cache invalidation (faster, but changes take ~1 hour)"
                echo "  --dry-run            Show what would be uploaded without actually uploading"
                echo "  --help, -h           Show this help message"
                echo ""
                echo "Examples:"
                echo "  ./quick-update.sh                    # Full update"
                echo "  ./quick-update.sh --skip-build       # Only upload (if already built)"
                echo "  ./quick-update.sh --dry-run          # Preview changes"
                echo ""
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Run './quick-update.sh --help' for usage"
                exit 1
                ;;
        esac
    done

    # Show warnings
    if [ "$SKIP_BUILD" = true ]; then
        print_warning "Skipping frontend build (using existing dist/)"
    fi

    if [ "$SKIP_INVALIDATION" = true ]; then
        print_warning "Skipping CloudFront invalidation (changes may take up to 1 hour)"
    fi

    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN MODE - No files will be uploaded"
    fi

    echo ""

    # Run steps
    check_requirements
    check_aws_credentials

    if [ "$SKIP_BUILD" = false ]; then
        build_frontend
    else
        if [ ! -d "$DIST_DIR" ]; then
            print_error "dist/ directory not found. Cannot skip build."
            exit 1
        fi
    fi

    get_terraform_outputs

    if [ "$DRY_RUN" = true ]; then
        print_info "DRY RUN: Would upload files from $DIST_DIR to s3://$S3_BUCKET/"
        print_info "DRY RUN: Would invalidate CloudFront distribution $DISTRIBUTION_ID"
        echo ""
        print_success "Dry run complete. Use without --dry-run to actually deploy."
        exit 0
    fi

    deploy_to_s3

    if [ "$SKIP_INVALIDATION" = false ]; then
        invalidate_cloudfront
    else
        print_info "Skipped CloudFront invalidation (changes will be visible after cache expires)"
    fi

    show_summary
}

# Run main function with all arguments
main "$@"
