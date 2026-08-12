[CmdletBinding()]
param(
  [string]$Profile = 'homefit',
  [string]$Region = 'ap-northeast-2',
  [string]$Project = 'homefit',
  [string]$Environment = 'production',
  [string]$AwsPath = ''
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($AwsPath)) {
  $awsCommand = Get-Command aws -ErrorAction SilentlyContinue
  $awsCandidates = @(
    $awsCommand.Source
    (Join-Path $env:LOCALAPPDATA 'Programs\Amazon\AWSCLIV2\aws.exe')
    (Join-Path $env:ProgramFiles 'Amazon\AWSCLIV2\aws.exe')
  ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

  $AwsPath = $awsCandidates |
    Where-Object { Test-Path -LiteralPath $_ } |
    Select-Object -First 1
}

if ([string]::IsNullOrWhiteSpace($AwsPath) -or -not (Test-Path -LiteralPath $AwsPath)) {
  throw 'AWS CLI was not found. Install AWS CLI v2 or pass -AwsPath explicitly.'
}

$aws = (Resolve-Path -LiteralPath $AwsPath).Path

function Invoke-Aws {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $output = & $aws @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "AWS CLI command failed: aws $($Arguments -join ' ')"
  }

  return $output
}

$accountId = (Invoke-Aws -Arguments @(
    'sts', 'get-caller-identity',
    '--profile', $Profile,
    '--query', 'Account',
    '--output', 'text'
  )).Trim()

if ($accountId -notmatch '^\d{12}$') {
  throw "Unexpected AWS account id: $accountId"
}

$bucketName = "$Project-$accountId-$Environment-terraform-state".ToLowerInvariant()

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
  $null = & $aws s3api head-bucket --bucket $bucketName --profile $Profile 2>$null
  $headBucketExitCode = $LASTEXITCODE
}
finally {
  $ErrorActionPreference = $previousErrorActionPreference
}

$bucketExists = $headBucketExitCode -eq 0

if (-not $bucketExists) {
  Write-Host "Creating Terraform state bucket: $bucketName"
  Invoke-Aws -Arguments @(
    's3api', 'create-bucket',
    '--bucket', $bucketName,
    '--region', $Region,
    '--create-bucket-configuration', "LocationConstraint=$Region",
    '--profile', $Profile
  ) | Out-Null
}
else {
  Write-Host "Terraform state bucket already exists: $bucketName"
}

$location = (Invoke-Aws -Arguments @(
    's3api', 'get-bucket-location',
    '--bucket', $bucketName,
    '--profile', $Profile,
    '--query', 'LocationConstraint',
    '--output', 'text'
  )).Trim()

if ($location -ne $Region) {
  throw "Bucket $bucketName is in '$location', expected '$Region'."
}

Invoke-Aws -Arguments @(
  's3api', 'put-bucket-ownership-controls',
  '--bucket', $bucketName,
  '--ownership-controls', 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]',
  '--profile', $Profile
) | Out-Null

Invoke-Aws -Arguments @(
  's3api', 'put-public-access-block',
  '--bucket', $bucketName,
  '--public-access-block-configuration',
  'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true',
  '--profile', $Profile
) | Out-Null

Invoke-Aws -Arguments @(
  's3api', 'put-bucket-versioning',
  '--bucket', $bucketName,
  '--versioning-configuration', 'Status=Enabled',
  '--profile', $Profile
) | Out-Null

Invoke-Aws -Arguments @(
  's3api', 'put-bucket-encryption',
  '--bucket', $bucketName,
  '--server-side-encryption-configuration',
  'Rules=[{ApplyServerSideEncryptionByDefault={SSEAlgorithm=AES256},BucketKeyEnabled=false}]',
  '--profile', $Profile
) | Out-Null

$tagging = @{
  TagSet = @(
    @{ Key = 'Project'; Value = $Project }
    @{ Key = 'Environment'; Value = $Environment }
    @{ Key = 'Purpose'; Value = 'terraform-state' }
    @{ Key = 'ManagedBy'; Value = 'bootstrap-script' }
  )
} | ConvertTo-Json -Depth 4 -Compress

$policy = @{
  Version = '2012-10-17'
  Statement = @(
    @{
      Sid = 'DenyInsecureTransport'
      Effect = 'Deny'
      Principal = '*'
      Action = 's3:*'
      Resource = @(
        "arn:aws:s3:::$bucketName"
        "arn:aws:s3:::$bucketName/*"
      )
      Condition = @{
        Bool = @{
          'aws:SecureTransport' = 'false'
        }
      }
    }
  )
} | ConvertTo-Json -Depth 8 -Compress

$temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("homefit-terraform-state-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null

try {
  $taggingPath = Join-Path $temporaryDirectory 'tagging.json'
  $policyPath = Join-Path $temporaryDirectory 'policy.json'
  [System.IO.File]::WriteAllText($taggingPath, $tagging, [System.Text.UTF8Encoding]::new($false))
  [System.IO.File]::WriteAllText($policyPath, $policy, [System.Text.UTF8Encoding]::new($false))

  Invoke-Aws -Arguments @(
    's3api', 'put-bucket-tagging',
    '--bucket', $bucketName,
    '--tagging', "file://$taggingPath",
    '--profile', $Profile
  ) | Out-Null

  Invoke-Aws -Arguments @(
    's3api', 'put-bucket-policy',
    '--bucket', $bucketName,
    '--policy', "file://$policyPath",
    '--profile', $Profile
  ) | Out-Null
}
finally {
  foreach ($temporaryFile in @($taggingPath, $policyPath)) {
    if ($temporaryFile -and (Test-Path -LiteralPath $temporaryFile)) {
      Remove-Item -LiteralPath $temporaryFile -Force
    }
  }

  if (Test-Path -LiteralPath $temporaryDirectory) {
    Remove-Item -LiteralPath $temporaryDirectory -Force
  }
}

Write-Host 'Terraform state bucket security settings are ready.'
Write-Output $bucketName
