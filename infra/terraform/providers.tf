provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(local.common_tags, var.additional_tags)
  }
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

data "aws_partition" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}
