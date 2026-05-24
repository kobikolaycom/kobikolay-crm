$body = @{
    object = "instagram"
    entry = @(
        @{
            id = "123"
            time = 1716480000
            messaging = @(
                @{
                    sender = @{ id = "TEST_SENDER_001" }
                    recipient = @{ id = "TEST_PAGE_001" }
                    timestamp = 1716480000000
                    message = @{
                        mid = "test_mid_001"
                        text = "Merhaba, bu bir test mesajidir!"
                    }
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "Sending test webhook to Vercel..."
Write-Host "Body: $body"
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "https://kobikolay-crm.vercel.app/api/webhooks/instagram" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
    Write-Host "STATUS: $($response.StatusCode)"
    Write-Host "RESPONSE: $($response.Content)"
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "ERROR BODY: $errorBody"
    }
}
