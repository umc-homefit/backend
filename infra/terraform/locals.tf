locals {
  name_prefix        = "${var.project_name}-${var.environment}"
  availability_zones = slice(sort(data.aws_availability_zones.available.names), 0, 2)

  subnet_map = {
    for index, az in local.availability_zones : az => {
      index       = index
      public_cidr = cidrsubnet(var.vpc_cidr, 8, index)
      app_cidr    = cidrsubnet(var.vpc_cidr, 8, index + 10)
      db_cidr     = cidrsubnet(var.vpc_cidr, 8, index + 20)
    }
  }

  nat_gateway_enabled = var.application_subnet_tier == "private" && var.enable_nat_gateway
  nat_gateway_count   = local.nat_gateway_enabled ? (var.nat_gateway_mode == "per_az" ? length(local.availability_zones) : 1) : 0
  compute_subnet_ids = var.application_subnet_tier == "public" ? (
    [for subnet in aws_subnet.public : subnet.id]
    ) : (
    [for subnet in aws_subnet.app : subnet.id]
  )
  tls_enabled = var.domain_name != null && var.route53_zone_id != null

  app_secret_name   = "/${var.project_name}/${var.environment}/backend"
  asset_bucket_name = "${var.project_name}-${data.aws_caller_identity.current.account_id}-${var.environment}-assets"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
