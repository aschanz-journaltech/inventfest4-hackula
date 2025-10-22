# CloudFront Distribution for CDN and HTTPS

# Origin Access Identity for S3
resource "aws_cloudfront_origin_access_identity" "website" {
  comment = "OAI for ${var.app_name} website"
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.app_name} ${var.environment}"
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class

  # Custom domain (if enabled)
  aliases = var.enable_custom_domain && var.domain_name != "" ? [var.domain_name] : []

  # S3 origin
  origin {
    domain_name = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id   = local.s3_origin_id

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.website.cloudfront_access_identity_path
    }
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = local.s3_origin_id

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600  # 1 hour
    max_ttl                = 86400 # 24 hours
    compress               = true

    # Lambda@Edge function for SPA routing (optional)
    # lambda_function_association {
    #   event_type   = "origin-request"
    #   lambda_arn   = aws_lambda_function.spa_router.qualified_arn
    # }
  }

  # Cache behavior for static assets (longer TTL)
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = local.s3_origin_id

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 31536000 # 1 year
    max_ttl                = 31536000 # 1 year
    compress               = true
  }

  # Custom error responses for SPA routing
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }

  # SSL certificate
  viewer_certificate {
    # Use ACM certificate if custom domain is enabled
    acm_certificate_arn      = var.enable_custom_domain ? aws_acm_certificate.website[0].arn : null
    ssl_support_method       = var.enable_custom_domain ? "sni-only" : null
    minimum_protocol_version = "TLSv1.2_2021"

    # Use default CloudFront certificate if no custom domain
    cloudfront_default_certificate = !var.enable_custom_domain
  }

  # Restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Optional: Access logging
  dynamic "logging_config" {
    for_each = var.enable_access_logging ? [1] : []
    content {
      bucket          = aws_s3_bucket.logs[0].bucket_domain_name
      prefix          = "cloudfront/"
      include_cookies = false
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.app_name}-distribution"
    }
  )

  # Wait for certificate validation
  depends_on = [
    aws_acm_certificate_validation.website
  ]
}

# CloudFront cache policy (alternative to forwarded_values)
resource "aws_cloudfront_cache_policy" "spa" {
  name        = "${var.app_name}-spa-cache-policy"
  comment     = "Cache policy for SPA with short TTL"
  default_ttl = 3600
  max_ttl     = 86400
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
      }
    }

    query_strings_config {
      query_string_behavior = "none"
    }

    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}

# CloudFront origin request policy
resource "aws_cloudfront_origin_request_policy" "spa" {
  name    = "${var.app_name}-spa-origin-policy"
  comment = "Origin request policy for SPA"

  cookies_config {
    cookie_behavior = "none"
  }

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
    }
  }

  query_strings_config {
    query_string_behavior = "none"
  }
}

# CloudFront Function for SPA routing (alternative to Lambda@Edge)
resource "aws_cloudfront_function" "spa_router" {
  name    = "${var.app_name}-spa-router"
  runtime = "cloudfront-js-1.0"
  comment = "Rewrite requests to index.html for SPA routing"
  publish = true

  code = <<-EOT
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Check if URI is missing a file extension (not a static asset)
  if (!uri.includes('.')) {
    request.uri = '/index.html';
  }

  return request;
}
EOT
}
