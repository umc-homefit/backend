resource "aws_cloudwatch_log_group" "backend" {
  name              = "/${var.project_name}/${var.environment}/backend"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${local.name_prefix}-backend"
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_hosts" {
  count = var.enable_compute ? 1 : 0

  alarm_name          = "${local.name_prefix}-alb-unhealthy-hosts"
  alarm_description   = "HomeFit ALB has an unhealthy API target."
  namespace           = "AWS/ApplicationELB"
  metric_name         = "UnHealthyHostCount"
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.cloudwatch_alarm_action_arns

  dimensions = {
    LoadBalancer = aws_lb.api[0].arn_suffix
    TargetGroup  = aws_lb_target_group.api[0].arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  count = var.enable_compute ? 1 : 0

  alarm_name          = "${local.name_prefix}-alb-5xx"
  alarm_description   = "HomeFit ALB returned repeated target 5xx responses."
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_Target_5XX_Count"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  threshold           = 5
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.cloudwatch_alarm_action_arns

  dimensions = {
    LoadBalancer = aws_lb.api[0].arn_suffix
    TargetGroup  = aws_lb_target_group.api[0].arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  count = var.enable_database ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-cpu-high"
  alarm_description   = "HomeFit RDS CPU utilization remained high for 10 minutes."
  namespace           = "AWS/RDS"
  metric_name         = "CPUUtilization"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  threshold           = var.db_cpu_alarm_threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.cloudwatch_alarm_action_arns

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main[0].identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_freeable_memory_low" {
  count = var.enable_database ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-freeable-memory-low"
  alarm_description   = "HomeFit RDS freeable memory remained below the configured threshold for 10 minutes."
  namespace           = "AWS/RDS"
  metric_name         = "FreeableMemory"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  threshold           = var.db_freeable_memory_alarm_bytes
  comparison_operator = "LessThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.cloudwatch_alarm_action_arns

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main[0].identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_free_storage_low" {
  count = var.enable_database ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-free-storage-low"
  alarm_description   = "HomeFit RDS free storage remained below the configured threshold for 10 minutes."
  namespace           = "AWS/RDS"
  metric_name         = "FreeStorageSpace"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  threshold           = var.db_free_storage_alarm_bytes
  comparison_operator = "LessThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.cloudwatch_alarm_action_arns

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main[0].identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  count = var.enable_database ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-connections-high"
  alarm_description   = "HomeFit RDS database connections remained high for 10 minutes."
  namespace           = "AWS/RDS"
  metric_name         = "DatabaseConnections"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  threshold           = var.db_connection_alarm_threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.cloudwatch_alarm_action_arns

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main[0].identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu_credit_low" {
  count = var.enable_database ? 1 : 0

  alarm_name          = "${local.name_prefix}-rds-cpu-credit-low"
  alarm_description   = "HomeFit burstable RDS instance has a low CPU credit balance."
  namespace           = "AWS/RDS"
  metric_name         = "CPUCreditBalance"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  threshold           = var.db_cpu_credit_alarm_threshold
  comparison_operator = "LessThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.cloudwatch_alarm_action_arns

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main[0].identifier
  }
}
