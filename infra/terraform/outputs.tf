output "aws_region" {
  description = "AWS deployment region."
  value       = var.aws_region
}

output "vpc_id" {
  description = "HomeFit VPC ID."
  value       = aws_vpc.main.id
}

output "ecr_repository_name" {
  description = "GitHub Actions AWS_ECR_REPOSITORY variable value."
  value       = aws_ecr_repository.backend.name
}

output "ecr_repository_url" {
  description = "Backend ECR repository URL."
  value       = aws_ecr_repository.backend.repository_url
}

output "assets_bucket_name" {
  description = "Private S3 bucket for HomeFit assets."
  value       = aws_s3_bucket.assets.id
}

output "backend_secret_arn" {
  description = "Secrets Manager ARN whose value must be populated outside Terraform."
  value       = aws_secretsmanager_secret.backend.arn
}

output "github_deploy_role_arn" {
  description = "GitHub Actions AWS_DEPLOY_ROLE_ARN variable value."
  value       = aws_iam_role.github_deploy.arn
}

output "rds_endpoint" {
  description = "Private RDS endpoint. Null until enable_database is true."
  value       = try(aws_db_instance.main[0].endpoint, null)
}

output "autoscaling_group_name" {
  description = "GitHub Actions AWS_ASG_NAME variable value. Null until enable_compute is true."
  value       = try(aws_autoscaling_group.api[0].name, null)
}

output "alb_dns_name" {
  description = "ALB DNS name. Null until enable_compute is true."
  value       = try(aws_lb.api[0].dns_name, null)
}

output "api_base_url" {
  description = "AWS API base URL. HTTPS is returned only when Route 53 and ACM are configured."
  value = var.enable_compute ? (
    local.tls_enabled ? "https://${var.domain_name}" : "http://${aws_lb.api[0].dns_name}"
  ) : null
}
