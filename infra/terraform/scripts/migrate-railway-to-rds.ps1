[CmdletBinding()]
param(
  [string]$AwsProfile = 'homefit',
  [string]$AwsRegion = 'ap-northeast-2',
  [string]$ProjectName = 'homefit',
  [string]$Environment = 'production',
  [string]$DbIdentifier = 'homefit-production-postgres',
  [ValidateRange(1, 65535)]
  [int]$LocalPort = 15432,
  [ValidateRange(10, 99)]
  [int]$ExpectedPostgresMajor = 18,
  [string]$PostgresImage = 'postgres:18-alpine'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$pluginDirectory = Join-Path $env:ProgramFiles 'Amazon\SessionManagerPlugin\bin'
$pluginExecutable = Join-Path $pluginDirectory 'session-manager-plugin.exe'
$temporaryRoot = [IO.Path]::GetFullPath($env:TEMP).TrimEnd([IO.Path]::DirectorySeparatorChar)
$backupDirectory = Join-Path $temporaryRoot ("homefit-rds-migration-" + [Guid]::NewGuid().ToString('N'))
$tunnelProcess = $null
$railwayUrl = $null
$dbSecret = $null
$sourcePgPassword = $null
$targetPgPassword = $null
$migrationSucceeded = $false

function Invoke-AwsJson {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)

  $output = @(& aws @Arguments)
  if ($LASTEXITCODE -ne 0) {
    throw "AWS CLI command failed with exit code $LASTEXITCODE."
  }

  return (($output -join [Environment]::NewLine) | ConvertFrom-Json)
}

function Invoke-DockerChecked {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)

  & docker @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Docker command failed with exit code $LASTEXITCODE."
  }
}

function Set-PostgresEnvironment {
  param(
    [Parameter(Mandatory = $true)][string]$HostName,
    [Parameter(Mandatory = $true)][string]$Port,
    [Parameter(Mandatory = $true)][string]$Database,
    [Parameter(Mandatory = $true)][string]$Username,
    [Parameter(Mandatory = $true)][string]$Password
  )

  $env:PGHOST = $HostName
  $env:PGPORT = $Port
  $env:PGDATABASE = $Database
  $env:PGUSER = $Username
  $env:PGPASSWORD = $Password
  $env:PGSSLMODE = 'require'
  $env:PGCONNECT_TIMEOUT = '15'
}

function Invoke-PsqlQuery {
  param(
    [Parameter(Mandatory = $true)][string]$Image,
    [Parameter(Mandatory = $true)][string]$Sql
  )

  $arguments = @(
    'run', '--rm',
    '--env', 'PGHOST',
    '--env', 'PGPORT',
    '--env', 'PGDATABASE',
    '--env', 'PGUSER',
    '--env', 'PGPASSWORD',
    '--env', 'PGSSLMODE',
    '--env', 'PGCONNECT_TIMEOUT',
    $Image,
    'psql', '--tuples-only', '--no-align', '--command', $Sql
  )
  $output = @(& docker @arguments)
  if ($LASTEXITCODE -ne 0) {
    throw 'PostgreSQL query failed.'
  }

  return $output
}

function Get-PostgresMajorVersion {
  param([Parameter(Mandatory = $true)][string]$Image)

  $versionOutput = @(Invoke-PsqlQuery -Image $Image -Sql "SELECT current_setting('server_version_num');")
  $versionNumber = ($versionOutput -join '').Trim()
  if ($versionNumber -notmatch '^\d+$') {
    throw "Unexpected PostgreSQL server_version_num: $versionNumber"
  }

  return [int]([int64]$versionNumber / 10000)
}

function Wait-LocalPort {
  param(
    [Parameter(Mandatory = $true)][int]$Port,
    [int]$Attempts = 15
  )

  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
      $client.Connect('127.0.0.1', $Port)
      return $true
    } catch [System.Net.Sockets.SocketException] {
      Start-Sleep -Seconds 2
    } finally {
      $client.Dispose()
    }
  }

  return $false
}

try {
  Write-Host ''
  Write-Host 'HomeFit Railway -> AWS RDS one-time migration' -ForegroundColor Cyan
  Write-Host 'The database URL will not be printed or written to the repository.'
  Write-Host ''

  if (-not (Test-Path -LiteralPath $pluginExecutable)) {
    throw 'AWS Session Manager plugin is not installed.'
  }

  if ($env:PATH -notlike "*$pluginDirectory*") {
    $env:PATH = "$pluginDirectory;$env:PATH"
  }

  $env:AWS_PROFILE = $AwsProfile
  $env:AWS_REGION = $AwsRegion
  $env:AWS_SDK_LOAD_CONFIG = '1'

  $null = Invoke-AwsJson -Arguments @(
    'sts', 'get-caller-identity',
    '--profile', $AwsProfile,
    '--region', $AwsRegion,
    '--output', 'json'
  )

  $null = docker info --format '{{.ServerVersion}}'
  if ($LASTEXITCODE -ne 0) {
    throw 'Docker Desktop is not ready.'
  }

  $secureUrl = Read-Host 'Paste Railway PostgreSQL DATABASE_PUBLIC_URL' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl)
  try {
    $railwayUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }

  $sourceUri = $null
  if (-not [Uri]::TryCreate($railwayUrl, [UriKind]::Absolute, [ref]$sourceUri)) {
    throw 'The Railway database URL is not a valid absolute URL.'
  }
  if ($sourceUri.Scheme -notin @('postgres', 'postgresql')) {
    throw 'The source URL must use postgres:// or postgresql://.'
  }
  if ([string]::IsNullOrWhiteSpace($sourceUri.Host)) {
    throw 'The source database host is missing.'
  }

  $userInfoSeparator = $sourceUri.UserInfo.IndexOf(':')
  if ($userInfoSeparator -le 0) {
    throw 'The source database URL does not contain a username and password.'
  }

  $sourcePgHost = $sourceUri.Host
  $sourcePgPort = if ($sourceUri.IsDefaultPort) { '5432' } else { [string]$sourceUri.Port }
  $sourcePgDatabase = [Uri]::UnescapeDataString($sourceUri.AbsolutePath.TrimStart('/'))
  $sourcePgUser = [Uri]::UnescapeDataString($sourceUri.UserInfo.Substring(0, $userInfoSeparator))
  $sourcePgPassword = [Uri]::UnescapeDataString($sourceUri.UserInfo.Substring($userInfoSeparator + 1))
  if ([string]::IsNullOrWhiteSpace($sourcePgDatabase)) {
    throw 'The source database name is missing.'
  }

  Set-PostgresEnvironment `
    -HostName $sourcePgHost `
    -Port $sourcePgPort `
    -Database $sourcePgDatabase `
    -Username $sourcePgUser `
    -Password $sourcePgPassword

  Write-Host 'Source URL accepted. Checking PostgreSQL version...' -ForegroundColor Green
  Invoke-DockerChecked -Arguments @('pull', $PostgresImage)
  $sourceMajor = Get-PostgresMajorVersion -Image $PostgresImage
  if ($sourceMajor -ne $ExpectedPostgresMajor) {
    throw "Railway PostgreSQL major version is $sourceMajor; expected $ExpectedPostgresMajor. Migration was not started."
  }
  Write-Host "Railway PostgreSQL major version is $sourceMajor." -ForegroundColor Green

  $migrationSql = 'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name;'
  $countSql = "SELECT json_build_object('users',(SELECT COUNT(*) FROM users),'notices',(SELECT COUNT(*) FROM notices),'noticeUnits',(SELECT COUNT(*) FROM notice_units),'loanProducts',(SELECT COUNT(*) FROM loan_products),'financeTerms',(SELECT COUNT(*) FROM finance_terms),'eligibilityAnalyses',(SELECT COUNT(*) FROM eligibility_analyses))::text;"
  $sourceMigrations = @(Invoke-PsqlQuery -Image $PostgresImage -Sql $migrationSql) |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ }
  $sourceCountsJson = (@(Invoke-PsqlQuery -Image $PostgresImage -Sql $countSql) -join '').Trim()
  $sourceCounts = $sourceCountsJson | ConvertFrom-Json

  $rdsResponse = Invoke-AwsJson -Arguments @(
    'rds', 'describe-db-instances',
    '--db-instance-identifier', $DbIdentifier,
    '--profile', $AwsProfile,
    '--region', $AwsRegion,
    '--output', 'json'
  )
  $rds = $rdsResponse.DBInstances[0]
  if ($rds.DBInstanceStatus -ne 'available') {
    throw "RDS is not available. Current status: $($rds.DBInstanceStatus)"
  }

  $ec2Response = Invoke-AwsJson -Arguments @(
    'ec2', 'describe-instances',
    '--filters',
    "Name=tag:Project,Values=$ProjectName",
    "Name=tag:Environment,Values=$Environment",
    'Name=instance-state-name,Values=running',
    '--profile', $AwsProfile,
    '--region', $AwsRegion,
    '--output', 'json'
  )
  $candidateInstanceIds = @(
    $ec2Response.Reservations |
      ForEach-Object { $_.Instances } |
      ForEach-Object { $_.InstanceId }
  )
  if ($candidateInstanceIds.Count -eq 0) {
    throw 'No running HomeFit EC2 instance was found for the SSM tunnel.'
  }

  $ssmResponse = Invoke-AwsJson -Arguments @(
    'ssm', 'describe-instance-information',
    '--profile', $AwsProfile,
    '--region', $AwsRegion,
    '--output', 'json'
  )
  $onlineInstanceIds = @(
    $ssmResponse.InstanceInformationList |
      Where-Object { $_.PingStatus -eq 'Online' } |
      ForEach-Object { $_.InstanceId }
  )
  $matchingInstanceIds = @(
    $candidateInstanceIds |
      Where-Object { $onlineInstanceIds -contains $_ } |
      Sort-Object
  )
  if ($matchingInstanceIds.Count -eq 0) {
    throw 'No online SSM-managed HomeFit EC2 instance was found for the tunnel.'
  }
  $instanceId = $matchingInstanceIds[0]

  $secretArn = [string]$rds.MasterUserSecret.SecretArn
  $secretResponse = Invoke-AwsJson -Arguments @(
    'secretsmanager', 'get-secret-value',
    '--secret-id', $secretArn,
    '--profile', $AwsProfile,
    '--region', $AwsRegion,
    '--output', 'json'
  )
  $dbSecret = $secretResponse.SecretString | ConvertFrom-Json
  $targetPgUser = [string]$dbSecret.username
  $targetPgPassword = [string]$dbSecret.password
  $targetPgDatabase = [string]$rds.DBName

  $portProbe = [System.Net.Sockets.TcpClient]::new()
  try {
    $portProbe.Connect('127.0.0.1', $LocalPort)
    throw "Local port $LocalPort is already in use."
  } catch [System.Net.Sockets.SocketException] {
    # Expected: the migration tunnel has not started yet.
  } finally {
    $portProbe.Dispose()
  }

  $awsExecutable = (Get-Command aws).Source
  $tunnelArguments = @(
    'ssm', 'start-session',
    '--target', $instanceId,
    '--document-name', 'AWS-StartPortForwardingSessionToRemoteHost',
    '--parameters', "host=$($rds.Endpoint.Address),portNumber=$($rds.Endpoint.Port),localPortNumber=$LocalPort",
    '--region', $AwsRegion,
    '--profile', $AwsProfile
  )
  $tunnelProcess = Start-Process `
    -FilePath $awsExecutable `
    -ArgumentList $tunnelArguments `
    -WindowStyle Hidden `
    -PassThru
  if (-not (Wait-LocalPort -Port $LocalPort)) {
    throw 'The SSM port forwarding tunnel did not become ready.'
  }
  Write-Host "Private RDS tunnel is ready through $instanceId." -ForegroundColor Green

  Set-PostgresEnvironment `
    -HostName 'host.docker.internal' `
    -Port ([string]$LocalPort) `
    -Database $targetPgDatabase `
    -Username $targetPgUser `
    -Password $targetPgPassword

  $targetMajor = Get-PostgresMajorVersion -Image $PostgresImage
  if ($targetMajor -ne $ExpectedPostgresMajor -or $targetMajor -ne $sourceMajor) {
    throw "PostgreSQL major versions do not match (Railway=$sourceMajor, RDS=$targetMajor, expected=$ExpectedPostgresMajor). Migration was not started."
  }
  Write-Host "RDS PostgreSQL major version matches Railway ($targetMajor)." -ForegroundColor Green

  $targetMigrations = @(Invoke-PsqlQuery -Image $PostgresImage -Sql $migrationSql) |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ }
  $migrationDifference = Compare-Object -ReferenceObject $sourceMigrations -DifferenceObject $targetMigrations
  if ($migrationDifference) {
    throw 'Railway and RDS Prisma migration histories differ. Migration was not started.'
  }
  Write-Host "Prisma migration history matches ($($sourceMigrations.Count) migrations)." -ForegroundColor Green

  $targetCountsJson = (@(Invoke-PsqlQuery -Image $PostgresImage -Sql $countSql) -join '').Trim()
  $targetCounts = $targetCountsJson | ConvertFrom-Json
  Write-Host ''
  Write-Host 'Railway source counts:' -ForegroundColor Cyan
  $sourceCounts | Format-List
  Write-Host 'AWS RDS current counts:' -ForegroundColor Cyan
  $targetCounts | Format-List

  $targetHasData = @(
    $targetCounts.PSObject.Properties |
      Where-Object { [int64]$_.Value -ne 0 }
  ).Count -gt 0
  if ($targetHasData) {
    throw 'AWS RDS is not empty. Migration was stopped to prevent duplicates or overwrites.'
  }

  $confirmation = Read-Host 'Type MIGRATE to copy all Railway application data into the empty AWS RDS'
  if ($confirmation -cne 'MIGRATE') {
    throw 'Migration cancelled by user.'
  }

  New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
  $mount = "type=bind,source=$backupDirectory,target=/backup"

  Write-Host 'Creating a consistent Railway data-only dump...' -ForegroundColor Cyan
  Set-PostgresEnvironment `
    -HostName $sourcePgHost `
    -Port $sourcePgPort `
    -Database $sourcePgDatabase `
    -Username $sourcePgUser `
    -Password $sourcePgPassword
  Invoke-DockerChecked -Arguments @(
    'run', '--rm',
    '--env', 'PGHOST',
    '--env', 'PGPORT',
    '--env', 'PGDATABASE',
    '--env', 'PGUSER',
    '--env', 'PGPASSWORD',
    '--env', 'PGSSLMODE',
    '--env', 'PGCONNECT_TIMEOUT',
    '--mount', $mount,
    $PostgresImage,
    'pg_dump', '--format=custom', '--file=/backup/railway.dump', '--data-only',
    '--no-owner', '--no-privileges', '--exclude-table=_prisma_migrations'
  )

  $dumpPath = Join-Path $backupDirectory 'railway.dump'
  if (-not (Test-Path -LiteralPath $dumpPath) -or (Get-Item -LiteralPath $dumpPath).Length -eq 0) {
    throw 'Railway dump file was not created.'
  }

  Write-Host 'Restoring into AWS RDS in a single transaction...' -ForegroundColor Cyan
  Set-PostgresEnvironment `
    -HostName 'host.docker.internal' `
    -Port ([string]$LocalPort) `
    -Database $targetPgDatabase `
    -Username $targetPgUser `
    -Password $targetPgPassword
  Invoke-DockerChecked -Arguments @(
    'run', '--rm',
    '--env', 'PGHOST',
    '--env', 'PGPORT',
    '--env', 'PGDATABASE',
    '--env', 'PGUSER',
    '--env', 'PGPASSWORD',
    '--env', 'PGSSLMODE',
    '--env', 'PGCONNECT_TIMEOUT',
    '--mount', $mount,
    $PostgresImage,
    'pg_restore', '--dbname', $targetPgDatabase, '--data-only', '--exit-on-error',
    '--single-transaction', '--no-owner', '--no-privileges', '/backup/railway.dump'
  )

  $restoredCountsJson = (@(Invoke-PsqlQuery -Image $PostgresImage -Sql $countSql) -join '').Trim()
  $restoredCounts = $restoredCountsJson | ConvertFrom-Json
  foreach ($property in $sourceCounts.PSObject.Properties) {
    if ([int64]$property.Value -ne [int64]$restoredCounts.($property.Name)) {
      throw "Count mismatch after restore for $($property.Name)."
    }
  }

  Write-Host ''
  Write-Host 'AWS RDS restored counts:' -ForegroundColor Green
  $restoredCounts | Format-List
  Write-Host 'Migration completed successfully.' -ForegroundColor Green
  $migrationSucceeded = $true
} catch {
  Write-Host ''
  Write-Host ("Migration stopped: " + $_.Exception.Message) -ForegroundColor Red
} finally {
  if ($tunnelProcess -and -not $tunnelProcess.HasExited) {
    taskkill /PID $tunnelProcess.Id /T /F 2>$null | Out-Null
  }

  $backupFullPath = [IO.Path]::GetFullPath($backupDirectory)
  $expectedPrefix = $temporaryRoot + [IO.Path]::DirectorySeparatorChar
  if (Test-Path -LiteralPath $backupFullPath) {
    if (-not $backupFullPath.StartsWith($expectedPrefix, [StringComparison]::OrdinalIgnoreCase)) {
      Write-Warning "Refusing to delete unexpected temporary path: $backupFullPath"
    } else {
      Remove-Item -LiteralPath $backupFullPath -Recurse -Force
    }
  }

  foreach ($name in @('PGPASSWORD', 'PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGSSLMODE', 'PGCONNECT_TIMEOUT')) {
    Remove-Item -LiteralPath ("Env:" + $name) -ErrorAction SilentlyContinue
  }

  $railwayUrl = $null
  $dbSecret = $null
  $secureUrl = $null
  $sourcePgPassword = $null
  $targetPgPassword = $null

  Write-Host ''
  if ($migrationSucceeded) {
    Write-Host 'Migration complete. Keep Railway available until API smoke tests pass.' -ForegroundColor Cyan
  } else {
    Write-Host 'No partial restore should remain because pg_restore used a single transaction.' -ForegroundColor Yellow
    Write-Host 'Share only the non-secret error message when requesting help.' -ForegroundColor Yellow
  }
}

if (-not $migrationSucceeded) {
  exit 1
}
