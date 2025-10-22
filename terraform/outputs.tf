# Output Values

output "website_url" {
  description = "Website URL"
  value       = var.enable_custom_domain && var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.website.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.website.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.website.domain_name
}

output "s3_bucket_name" {
  description = "S3 bucket name for website content"
  value       = aws_s3_bucket.website.id
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.website.arn
}

output "oauth_redirect_uri" {
  description = "OAuth callback redirect URI to configure in Atlassian"
  value       = var.enable_custom_domain && var.domain_name != "" ? "https://${var.domain_name}/oauth/callback" : "https://${aws_cloudfront_distribution.website.domain_name}/oauth/callback"
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN (if custom domain enabled)"
  value       = var.enable_custom_domain ? aws_acm_certificate.website[0].arn : null
}

output "deployment_command" {
  description = "Command to deploy website files"
  value       = "aws s3 sync ../dist/ s3://${aws_s3_bucket.website.id}/ --delete --cache-control 'public,max-age=31536000,immutable' --exclude 'index.html' && aws s3 cp ../dist/index.html s3://${aws_s3_bucket.website.id}/index.html --cache-control 'public,max-age=0,must-revalidate'"
}

output "invalidation_command" {
  description = "Command to invalidate CloudFront cache"
  value       = "aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.website.id} --paths '/*'"
}

output "logs_bucket_name" {
  description = "S3 bucket name for access logs (if enabled)"
  value       = var.enable_access_logging ? aws_s3_bucket.logs[0].id : null
}
