data "aws_ssm_parameter" "al2023_ami" {
  count = var.enable_compute ? 1 : 0

  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

resource "aws_launch_template" "api" {
  count = var.enable_compute ? 1 : 0

  name_prefix            = "${local.name_prefix}-api-"
  image_id               = data.aws_ssm_parameter.al2023_ami[0].value
  instance_type          = var.instance_type
  update_default_version = true

  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }

  vpc_security_group_ids = [aws_security_group.app.id]

  metadata_options {
    http_endpoint               = "enabled"
    http_protocol_ipv6          = "disabled"
    http_put_response_hop_limit = 1
    http_tokens                 = "required"
    instance_metadata_tags      = "disabled"
  }

  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      delete_on_termination = true
      encrypted             = true
      volume_size           = var.root_volume_size
      volume_type           = "gp3"
    }
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh.tftpl", {
    aws_region          = var.aws_region
    app_port            = var.app_port
    app_secret_arn      = aws_secretsmanager_secret.backend.arn
    database_secret_arn = aws_db_instance.main[0].master_user_secret[0].secret_arn
    database_host       = aws_db_instance.main[0].address
    database_port       = aws_db_instance.main[0].port
    database_name       = var.db_name
    ecr_registry        = split("/", aws_ecr_repository.backend.repository_url)[0]
    image_uri           = "${aws_ecr_repository.backend.repository_url}:${var.container_image_tag}"
    log_group_name      = aws_cloudwatch_log_group.backend.name
  }))

  tag_specifications {
    resource_type = "instance"

    tags = merge(local.common_tags, var.additional_tags, {
      Name = "${local.name_prefix}-api"
    })
  }

  tag_specifications {
    resource_type = "volume"

    tags = merge(local.common_tags, var.additional_tags, {
      Name = "${local.name_prefix}-api"
    })
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "api" {
  count = var.enable_compute ? 1 : 0

  name                = "${local.name_prefix}-api-asg"
  min_size            = var.asg_min_size
  desired_capacity    = var.asg_desired_capacity
  max_size            = var.asg_max_size
  vpc_zone_identifier = [for subnet in aws_subnet.app : subnet.id]

  health_check_type         = "ELB"
  health_check_grace_period = 300
  default_cooldown          = 120
  target_group_arns         = [aws_lb_target_group.api[0].arn]

  launch_template {
    id      = aws_launch_template.api[0].id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"

    preferences {
      min_healthy_percentage = 50
      instance_warmup        = 180
    }

  }

  dynamic "tag" {
    for_each = merge(local.common_tags, var.additional_tags, {
      Name = "${local.name_prefix}-api"
    })

    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }

  lifecycle {
    ignore_changes = [desired_capacity]

    precondition {
      condition     = var.enable_database && var.enable_nat_gateway
      error_message = "enable_compute requires both enable_database and enable_nat_gateway."
    }

    precondition {
      condition     = var.asg_min_size <= var.asg_desired_capacity && var.asg_desired_capacity <= var.asg_max_size
      error_message = "Auto Scaling sizes must satisfy min <= desired <= max."
    }
  }
}

resource "aws_autoscaling_policy" "api_cpu" {
  count = var.enable_compute ? 1 : 0

  name                   = "${local.name_prefix}-api-cpu-target"
  autoscaling_group_name = aws_autoscaling_group.api[0].name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }

    target_value = 60
  }
}
