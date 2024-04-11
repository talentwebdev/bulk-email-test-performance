# Kidoz Engineer Test

## Overview

After having an exceptional year our CEO has decided to grant everyone in our large company bonus vacation days, we therefore wrote the following typescript code to email the notice to everyone in the company. Unfortunately the code ran very slowly.

## Why Code Runs Slowly

I found 2 reasons relating to slowness of the code. 
1. The `grantVacation` function include nested loop. So, the time complexity of this function will be O(n^2).  
If we use `Map` object, it can be reduced to O(n). 
2. It flush all emails in a single batch. But, when we have large amount of employees, this will be problem. 
[Bulk Email Provider](https://www.mailersend.com/blog/delay-schedule-email-batch-delivery#how-do-you-send-a-batch-email) has some rate limit for number of emails per batch. 
Also, have rate limit for concurrent API requests. So, including large amount of emails in a single batch will cause a problem. 

## How to resolve this issue

### Use `Map` data structure to store `Addresses` and `Employees`. 

This will reduce the time complexity of the function to O(n) from O(n^2).

### Split into Chunks and Use `Promise.all` to send emails concurrently. 

Split the `payroll` array into chunked items, which chunk size is ideal number of emails per batch. This can be catched from email service provider's document.         
Once, split into chunks, do another chunks to make concurrent requests using `Promise.all`, which take advantage of JavaScript EventLoop concept. In this case, the chunk size will be ideal number of concurrent API requests. This is to avoid rate limiting of API requests from email service provider. 

## Compare the result 

To compare the results, I make mocked service class for email API provider. It implements `createBatch`, `queueEmail`, `flushBatch`. 
So in `flushBatch` method, it'll elapse time with `setTimeout` with calculated time based on number of queued emails. 

```
[1]: Sending 100 emails, single email elapsing time: 0.09544278402881372
[1]: Sent 100 emails. Elapsed time: 9.544278402881371
grantVacation: Elapsed time: 9550
[1]: Sending 10 emails, single email elapsing time: 0.05936739804173572
[2]: Sending 10 emails, single email elapsing time: 0.03055294964460218
[3]: Sending 10 emails, single email elapsing time: 0.0628107961747281
[4]: Sending 10 emails, single email elapsing time: 0.09313380720866175
[5]: Sending 10 emails, single email elapsing time: 0.07016786323048363
[6]: Sending 10 emails, single email elapsing time: 0.04949582980345997
[7]: Sending 10 emails, single email elapsing time: 0.05661933859351618
[8]: Sending 10 emails, single email elapsing time: 0.095699657254289
[9]: Sending 10 emails, single email elapsing time: 0.023153309491002028
[10]: Sending 10 emails, single email elapsing time: 0.0678110168375025
[9]: Sent 10 emails. Elapsed time: 0.23153309491002028
[2]: Sent 10 emails. Elapsed time: 0.3055294964460218
[6]: Sent 10 emails. Elapsed time: 0.4949582980345997
[7]: Sent 10 emails. Elapsed time: 0.5661933859351618
[1]: Sent 10 emails. Elapsed time: 0.5936739804173572
[3]: Sent 10 emails. Elapsed time: 0.6281079617472809
[10]: Sent 10 emails. Elapsed time: 0.678110168375025
[5]: Sent 10 emails. Elapsed time: 0.7016786323048363
[4]: Sent 10 emails. Elapsed time: 0.9313380720866176
[8]: Sent 10 emails. Elapsed time: 0.95699657254289
grantVacationV2: Elapsed time: 961
```

As you can find in the logs, `grantVacation` took around `9550ms` to send 100 emails. But, upgraded version `grantVacationV2` took around `961ms` to send same amount of emails. 