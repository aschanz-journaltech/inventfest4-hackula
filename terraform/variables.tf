# Input Variables

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "app_name" {
  description = "Application name (used for resource naming)"
  type        = string
  default     = "story-point-sleuth"
}

variable "domain_name" {
  description = "Custom domain name (optional, e.g., sleuth.example.com)"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for custom domain (required if domain_name is set)"
  type        = string
  default     = ""
}

variable "enable_custom_domain" {
  description = "Enable custom domain and ACM certificate"
  type        = bool
  default     = false
}

variable "cloudfront_price_class" {
  description = "CloudFront price class (PriceClass_All, PriceClass_200, PriceClass_100)"
  type        = string
  default     = "PriceClass_100" # US, Canada, Europe
}

variable "oauth_redirect_uri" {
  description = "OAuth callback redirect URI (will be output after deployment)"
  type        = string
  default     = ""
}

variable "enable_access_logging" {
  description = "Enable S3 access logging"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}
