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

  nat_gateway_count = var.enable_nat_gateway ? (var.nat_gateway_mode == "per_az" ? length(local.availability_zones) : 1) : 0
  tls_enabled       = var.domain_name != null && var.route53_zone_id != null

  app_secret_name   = "/${var.project_name}/${var.environment}/backend"
  asset_bucket_name = "${var.project_name}-${data.aws_caller_identity.current.account_id}-${var.environment}-assets"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
