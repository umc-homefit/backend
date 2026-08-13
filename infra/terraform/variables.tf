variable "aws_region" {
  description = "AWS resources region."
  type        = string
  default     = "ap-northeast-2"
}

variable "project_name" {
  description = "Project name used in resource names and tags."
  type        = string
  default     = "homefit"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for the HomeFit VPC."
  type        = string
  default     = "10.40.0.0/16"
}

variable "enable_nat_gateway" {
  description = "Create paid NAT Gateway resources when application_subnet_tier is private. Ignored for public compute."
  type        = bool
  default     = false
}

variable "nat_gateway_mode" {
  description = "single uses one NAT Gateway; per_az creates one in each AZ."
  type        = string
  default     = "single"

  validation {
    condition     = contains(["single", "per_az"], var.nat_gateway_mode)
    error_message = "nat_gateway_mode must be single or per_az."
  }
}

variable "application_subnet_tier" {
  description = "Subnet tier for the API ASG. public avoids NAT Gateway cost; private requires enable_nat_gateway=true."
  type        = string
  default     = "public"

  validation {
    condition     = contains(["public", "private"], var.application_subnet_tier)
    error_message = "application_subnet_tier must be public or private."
  }
}

variable "enable_database" {
  description = "Create the paid RDS PostgreSQL instance."
  type        = bool
  default     = false
}

variable "enable_compute" {
  description = "Create the paid ALB and EC2 Auto Scaling runtime. Requires database; private compute also requires NAT Gateway."
  type        = bool
  default     = false
}

variable "app_port" {
  description = "NestJS container port."
  type        = number
  default     = 3000
}

variable "health_check_path" {
  description = "ALB and container health check path."
  type        = string
  default     = "/api/health"
}

variable "instance_type" {
  description = "EC2 instance type for the API Auto Scaling Group."
  type        = string
  default     = "t3.small"
}

variable "root_volume_size" {
  description = "EC2 root EBS volume size in GiB."
  type        = number
  default     = 20
}

variable "asg_min_size" {
  description = "Minimum number of API EC2 instances."
  type        = number
  default     = 1
}

variable "asg_desired_capacity" {
  description = "Initial desired number of API EC2 instances."
  type        = number
  default     = 1
}

variable "asg_max_size" {
  description = "Maximum number of API EC2 instances."
  type        = number
  default     = 3
}

variable "container_image_tag" {
  description = "ECR image tag pulled when an EC2 instance starts."
  type        = string
  default     = "latest"
}

variable "db_name" {
  description = "Initial PostgreSQL database name."
  type        = string
  default     = "homefit"
}

variable "db_master_username" {
  description = "RDS master username. Password is managed by RDS in Secrets Manager."
  type        = string
  default     = "homefit_admin"
}

variable "db_engine_version" {
  description = "PostgreSQL major engine version."
  type        = string
  default     = "16"
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Initial RDS storage in GiB."
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum RDS autoscaled storage in GiB."
  type        = number
  default     = 100
}

variable "db_multi_az" {
  description = "Enable paid RDS Multi-AZ standby. Keep false for the initial cost-conscious environment."
  type        = bool
  default     = false
}

variable "db_backup_retention_days" {
  description = "Automated RDS backup retention in days. The initial AWS Free Plan permits one day; increase after upgrading the account plan."
  type        = number
  default     = 1

  validation {
    condition     = var.db_backup_retention_days >= 1 && var.db_backup_retention_days <= 35
    error_message = "db_backup_retention_days must be between 1 and 35 so automated backups remain enabled."
  }
}

variable "db_deletion_protection" {
  description = "Protect the RDS instance from accidental deletion."
  type        = bool
  default     = true
}

variable "db_skip_final_snapshot" {
  description = "Skip the final RDS snapshot on destroy. Keep false for production."
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention period."
  type        = number
  default     = 14
}

variable "cloudwatch_alarm_action_arns" {
  description = "Optional SNS topic ARNs notified when a CloudWatch alarm enters ALARM state."
  type        = list(string)
  default     = []
}

variable "db_cpu_alarm_threshold" {
  description = "RDS CPUUtilization percentage that triggers an alarm."
  type        = number
  default     = 80

  validation {
    condition     = var.db_cpu_alarm_threshold > 0 && var.db_cpu_alarm_threshold <= 100
    error_message = "db_cpu_alarm_threshold must be greater than 0 and at most 100."
  }
}

variable "db_freeable_memory_alarm_bytes" {
  description = "RDS FreeableMemory threshold in bytes."
  type        = number
  default     = 134217728

  validation {
    condition     = var.db_freeable_memory_alarm_bytes > 0
    error_message = "db_freeable_memory_alarm_bytes must be greater than 0."
  }
}

variable "db_free_storage_alarm_bytes" {
  description = "RDS FreeStorageSpace threshold in bytes."
  type        = number
  default     = 5368709120

  validation {
    condition     = var.db_free_storage_alarm_bytes > 0
    error_message = "db_free_storage_alarm_bytes must be greater than 0."
  }
}

variable "db_connection_alarm_threshold" {
  description = "RDS DatabaseConnections count that triggers an alarm."
  type        = number
  default     = 60

  validation {
    condition     = var.db_connection_alarm_threshold > 0
    error_message = "db_connection_alarm_threshold must be greater than 0."
  }
}

variable "db_cpu_credit_alarm_threshold" {
  description = "RDS CPUCreditBalance threshold for burstable DB instance classes."
  type        = number
  default     = 20

  validation {
    condition     = var.db_cpu_credit_alarm_threshold >= 0
    error_message = "db_cpu_credit_alarm_threshold must be at least 0."
  }
}

variable "github_repository" {
  description = "GitHub repository allowed to assume the deploy role."
  type        = string
  default     = "umc-homefit/backend"
}

variable "github_environment" {
  description = "Protected GitHub Environment used by the AWS deployment workflow."
  type        = string
  default     = "aws-production"
}

variable "domain_name" {
  description = "Optional API FQDN. Set together with route53_zone_id to enable ACM HTTPS."
  type        = string
  default     = null
  nullable    = true
}

variable "route53_zone_id" {
  description = "Optional existing Route 53 hosted zone ID for domain_name."
  type        = string
  default     = null
  nullable    = true
}

variable "additional_tags" {
  description = "Additional tags merged into every supported resource."
  type        = map(string)
  default     = {}
}
