$BASE = "http://localhost:8080"

Write-Host "Run: Register user..."
$registerResponse = Invoke-RestMethod -Uri "$BASE/api/v1/auth/register" -Method POST -ContentType "application/json" -Body '{"email":"smoke@example.com","password":"SmokePass123"}'
$USER_ID = $registerResponse.id
Write-Host "User created: $USER_ID"

Write-Host "Login..."
$loginResponse = Invoke-RestMethod -Uri "$BASE/api/v1/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"smoke@example.com","password":"SmokePass123"}'
$TOKEN = $loginResponse.token
Write-Host "Token: $TOKEN"

Write-Host "Register a file..."
$headers = @{
    "Content-Type" = "application/json"
    "X-User-Id" = $USER_ID
}
$fileResponse = Invoke-RestMethod -Uri "$BASE/api/v1/files/register" -Method POST -Headers $headers -Body '{"filename":"smoke.txt","hash":"deadbeef","size_bytes":100,"mime_type":"text/plain"}'
Write-Host "File Response:" ($fileResponse | ConvertTo-Json)

Write-Host "Done"