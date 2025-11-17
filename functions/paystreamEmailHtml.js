/**
 * This script is designed to run in a Make.com "Code" module.
 * It uses the Handlebars.js library and the required callback function.
 * This version is built to work with the final, correct data structure.
 *
 * Input Parameter:
 * - Name: bundle
 * - Value: Map the entire output object from the preceding module. The script
 * expects this object to have a "value" property containing a JSON string.
 */
async function run(input, callback) {
    // DEBUG: Log the start and the raw input object
    console.log('--- Script execution started (Handlebars - Final Version) ---');
    console.log(`Raw input received: ${JSON.stringify(input, null, 2)}`);

    try {
        const Handlebars = require('handlebars');

        // 1. --- VALIDATE AND CORRECTLY PARSE THE INPUT DATA ---
        if (!input.bundle || typeof input.bundle.value !== 'string' || input.bundle.value.length === 0) {
            throw new Error('Input parameter "bundle" or its "value" property is invalid, not a string, or is empty.');
        }
        
        // The 'value' is a stringified array from the previous module's output.
        const parsedValue = JSON.parse(input.bundle.value);
        
        // The actual data is nested inside the parsed structure.
        const sourceData = parsedValue[0].array[0];
        console.log('Successfully accessed source data object.');

        // 2. --- DEFINE THE HTML TEMPLATE ---
        const emailTemplate = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>Assignment Schedule Review</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; color: #222222; margin: 16px; }
            p.context { background: #f7f9fb; border-left: 4px solid #2b7cff; padding: 12px; }
            h2 { font-size: 16px; margin: 20px 0 8px; color: #0b4da2; }
            table { border-collapse: collapse; width: 100%; max-width: 900px; margin-bottom: 18px; }
            th, td { border: 1px solid #d0d7de; padding: 8px 10px; text-align: left; vertical-align: top; }
            th { background: #f1f5fb; font-weight: 600; width: 240px; }
            .small { font-size: 12px; color: #555; }
            .muted { color: #555; }
          </style>
        </head>
        <body>
          <p class="context"><strong>Context:</strong> "{{context}}"</p>
          <h2>Originating email — basic info</h2>
          <table>
            <tr>
              <th>Timestamp (originating email)</th>
              <td>{{originatingEmail.timestamp}}</td>
            </tr>
            <tr>
              <th>Subject</th>
              <td>{{originatingEmail.subject}}</td>
            </tr>
          </table>
          <h2>Agreement Schedule</h2>
          <table>
            <tr>
              <th>Worker name</th>
              <td>{{agreementSchedule.workerName}}</td>
            </tr>
            <tr>
              <th>Agency name</th>
              <td>{{agreementSchedule.agencyName}}</td>
            </tr>
            <tr>
              <th>End client name</th>
              <td>{{agreementSchedule.endClientName}}</td>
            </tr>
            <tr>
              <th>Job title</th>
              <td>
                {{#if agreementSchedule.jobTitle}}
                  {{agreementSchedule.jobTitle}}
                {{else}}
                  <span class="muted">Not provided</span>
                {{/if}}
              </td>
            </tr>
            <tr>
              <th>Assignment start date</th>
              <td>{{agreementSchedule.startDate}}</td>
            </tr>
            <tr>
              <th>Assignment end date</th>
              <td>{{agreementSchedule.endDate}}</td>
            </tr>
            <tr>
              <th>Pay rate</th>
              <td>{{agreementSchedule.payRate}}</td>
            </tr>
            <tr>
              <th>Notice period</th>
              <td>{{agreementSchedule.noticePeriod}}</td>
            </tr>
            <tr>
              <th>Number of holidays</th>
              <td>{{agreementSchedule.holidays}}</td>
            </tr>
            <tr>
              <th>Pay period</th>
              <td>{{agreementSchedule.payPeriod}}</td>
            </tr>
          </table>
          <h2>Originating email — headers</h2>
          <table>
            <tr><th>Header</th><th>Value</th></tr>
            {{#each emailHeaders}}
            <tr>
              <th>{{header}}</th>
              <td>{{{value}}}</td>
            </tr>
            {{/each}}
          </table>
          <p class="small">{{closingNotes}}</p>
        </body>
        </html>`;

        // 3. --- TRANSFORM THE DATA FOR THE TEMPLATE ---
        console.log('Starting data transformation...');
        
        if (typeof sourceData.response !== 'string') {
            throw new Error('"response" field is not a string and cannot be parsed.');
        }
        const rawScheduleData = JSON.parse(sourceData.response);

        const agreementSchedule = {
            workerName: rawScheduleData.worker_name,
            agencyName: rawScheduleData.agency_name,
            endClientName: rawScheduleData.end_client_name,
            jobTitle: rawScheduleData.job_title,
            startDate: rawScheduleData.assignment_start_date,
            endDate: rawScheduleData.assignment_end_date,
            payRate: rawScheduleData.pay_rate,
            noticePeriod: rawScheduleData.notice_period,
            holidays: rawScheduleData.number_of_holidays,
            payPeriod: rawScheduleData.pay_period,
        };
        
        const emailHeaders = Object.keys(sourceData.headers).map(header => {
            const value = Array.isArray(sourceData.headers[header]) 
                ? sourceData.headers[header].join('<br><br>')
                : sourceData.headers[header];
            return { header, value };
        });

        const templateData = {
            context: "A new assignment schedule has been received. Please review the following information carefully against the original schedule, which is attached for your reference.",
            originatingEmail: {
                timestamp: sourceData.date || 'Not provided',
                subject: sourceData.subject || 'Not provided'
            },
            agreementSchedule,
            emailHeaders,
            closingNotes: "Please review the \"Agreement Schedule\" above against the attached original schedule and advise of any discrepancies."
        };
        console.log('Data transformation complete.');

        // 4. --- COMPILE AND RENDER THE HTML ---
        console.log('Compiling and rendering template with Handlebars...');
        const template = Handlebars.compile(emailTemplate);
        const finalHtml = template(templateData);

        // 5. --- RETURN THE RESULT VIA CALLBACK ---
        console.log('--- HTML rendering successful ---');
        callback(null, {
            emailHtml: finalHtml
        });

    } catch (error) {
        console.error('--- ERROR CAUGHT ---');
        console.error(`Error Message: ${error.message}`);
        console.error(`Error Stack: ${error.stack}`);
        callback(error);
    }
}

// --- LOCAL TESTING HARNESS ---
// This block will only run when the script is executed directly from the command line.
// It will not run inside the Make.com environment.
if (require.main === module) {
    // 1. Simulate the input that Make.com provides to the module.
    const testInput = {
        bundle: {
            value: JSON.stringify([
    {
        "array": [
            {
                "date": "2025-10-22T09:57:32.970Z",
                "headers": {
                    "received": [
                        "by mail-oi1-f182.google.com with SMTP id 5614622812f47-4444887d8d1so2041438b6e.1 for <hd9r2awqnjjrcduwc4cgxlgqze1bbstj@hook.eu2.make.com>; Wed, 22 Oct 2025 02:57:32 -0700 (PDT)",
                        "by 2002:ac9:7086:0:b0:5fa:631f:e555 with SMTP id y6csp9787518ocr; Wed, 22 Oct 2025 02:57:28 -0700 (PDT)",
                        "from mail-sor-f41.google.com (mail-sor-f41.google.com. [209.85.220.41]) by mx.google.com with SMTPS id a640c23a62f3a-b65e7e984e6sor487695566b.3.2025.10.22.02.57.27 for <m.skinner+paystreaminbox@make.com> (Google Transport Security); Wed, 22 Oct 2025 02:57:27 -0700 (PDT)",
                        "from imt-engine-scheduling-engine-7cd5dbc564-tnv8g.mail-private.make.com (ec2-52-50-32-186.eu-west-1.compute.amazonaws.com. [52.50.32.186]) by smtp.gmail.com with ESMTPSA id a640c23a62f3a-b65e83976a2sm1295014366b.32.2025.10.22.02.57.24 for <m.skinner+paystreaminbox@make.com> (version=TLS1_3 cipher=TLS_AES_256_GCM_SHA384 bits=256/256); Wed, 22 Oct 2025 02:57:25 -0700 (PDT)"
                    ],
                    "arc-seal": [
                        "i=2; a=rsa-sha256; t=1761127051; cv=pass; d=google.com; s=arc-20240605; b=gK6vB+g+G0Hv1o2mUVVUHFn2bVOxhMMRj/jmrNszWzX5p8vfMHvxh5heGgIXSOX4JK Mwz5hLRwb6oagBEOTEiKUD9wRw0htUnwz6OI3BQ53a+qkqRGaCBXKMBIUlASFkL3qswD 1heHY4F6nBcudx0O7w+AvIV4QAMG6xPADl4jqGn/732tth2WhR98ZmVM7jo509NC7fuI /aghk/aYXNipJRx0g+BnfaVli2t04RmwTbOJL8iB1ZY/avXjbbukV9ZLhYKy6WHXQ/Ik 2wbKR1thBti3uUfJlwhMuHuzh6Kdw0Ad7oPy/Fh7x/Xk27F/OkUGagakCxz17ebviSKp VL3Q==",
                        "i=1; a=rsa-sha256; t=1761127047; cv=none; d=google.com; s=arc-20240605; b=kLKjl2iaU0wuC9jO9v5HtpX8kQQyTugTM6sad6Fp+9lsgkq4Q6C7LjIgISTyAYhqwN qG90uAIWHEAl/+6dchhMLQa4YupuR3lntFCDHSiFCriz3eatIv5qhVrSwFkUmej2r356 Clij/LqV74eVkfHumuVs4bPc2HULF6QBQwygey1TwaIhDCnBXSRQoaStuK7qXlkmmeXN 9k6AsNH9rDdpuS7tlSI3JHlxLCxb64azcist4NiuK5PTjtbZehRRepwLtwPFAc5L91PI J+1aIB/q9qHHiWoHLVAXyI0eVuRIWDQ6gM5GA1isaBdjfVeZQbc0KqTAb3bqpiA/DUsu kXig=="
                    ],
                    "arc-message-signature": [
                        "i=2; a=rsa-sha256; c=relaxed/relaxed; d=google.com; s=arc-20240605; h=mime-version:date:message-id:subject:to:from:dkim-signature :delivered-to; bh=1hqCCQEEIMzyHi08QMVsNbqRV3T7zbve5nvxVJsRuIA=; fh=8vRPkOsB/sOMB2EWf37Cc6tP6w7Bk7i7+WbTkWLxLHY=; b=fY+cWZ6h6JZdb7ofAz5atSBwaDQ9briMj2vdqSh7Di7Bg6dd/jAt6oZAP52JbjTKlC R3n19IzcBDKIIbcEDVN2zTeGotVOKuSCckwU1fUpkkJPkC56xbGAsSDBKnDAkr5VL5n6 EMyyeptPAIx1HI0ltBg5kOhmlXXL2w+mgGgrnuPl2GlDQfsagtpPf7uWtAINC2Q4dgFR Q39TZwsiCHGQbGZOTAMAUszsdULjxwl8ldrCQlne0lm/pPHSdM0bb+WOaCR7sQQruqRy 3Dp7bfEwgRSTZbgmJ+QmRkCMeBvjj+Sz0RaQyaA1bAyCVr3D8esLpr7zkNV0oy4llT6l w1ZQ==; darn=hook.eu2.make.com",
                        "i=1; a=rsa-sha256; c=relaxed/relaxed; d=google.com; s=arc-20240605; h=mime-version:date:message-id:subject:to:from:dkim-signature; bh=1hqCCQEEIMzyHi08QMVsNbqRV3T7zbve5nvxVJsRuIA=; fh=v00dQ2kB2Ismi54wwBIMx6y3zsi9XnLx/MJcZTfgiCk=; b=Hcvy5qxYcG3WYNd6FTyQZM/uBj5hAomoVDCSFuHacmzJvL/uharK6vKhxmsbeHSmnB w1CYfMc+LDhAdGBHBcLaon8LoVPA2qAasFRs3VvUf5fKiXz3nuK2GymwOuFR3b4bvQaJ 2cQ7BmvZ+IEVGJ5r5AC+hw73NMYCExCzojpUig5lV+Aj5OE3Ya8axIKOG3fyrHbl6GYw AbJqaP44Y4mQkC0c5DZNbRgXZHAygO8DUeIV1ISq5v25jPLxXTah9DUVIIHNqMVCmfbg 8XK7egeT4F8FeQ3nXTWV+pLfD+JY/89aikYWAyP5IKLHIrx+pA/FtLU05KzzuO7jnQRC ib2g==; dara=google.com"
                    ],
                    "arc-authentication-results": [
                        "i=2; mx.google.com; dkim=pass header.i=@make-com.20230601.gappssmtp.com header.s=20230601 header.b=sLinQ9Hx; spf=pass (google.com: domain of m.skinner@make.com designates 209.85.220.41 as permitted sender) smtp.mailfrom=m.skinner@make.com; dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=make.com; dara=neutral header.i=@make.com",
                        "i=1; mx.google.com; dkim=pass header.i=@make-com.20230601.gappssmtp.com header.s=20230601 header.b=sLinQ9Hx; spf=pass (google.com: domain of m.skinner@make.com designates 209.85.220.41 as permitted sender) smtp.mailfrom=m.skinner@make.com; dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=make.com; dara=neutral header.i=@make.com"
                    ],
                    "x-google-dkim-signature": "v=1; a=rsa-sha256; c=relaxed/relaxed; d=1e100.net; s=20230601; t=1761127051; x=1761731851; h=mime-version:date:message-id:subject:to:from:dkim-signature :delivered-to:x-forwarded-for:x-forwarded-to:x-gm-message-state:from :to:cc:subject:date:message-id:reply-to; bh=1hqCCQEEIMzyHi08QMVsNbqRV3T7zbve5nvxVJsRuIA=; b=Kp5ZcJTLT1TO7R/8Tc90w3ANc4nyBo/pLp4kHeUqfFOkQQaNYvJbFi3GlQRKTNiVG7 F6Qll5UwosfVWv/UZNnYlRxT3B/EWeKdfNDFwcMGVW4XvyxK+1ga74b080CdQX8zeeys grgKx4eBXa9yys9ILgJYpIPnKjLO4/kwJcK2QFanTxxJ//iDdqHZGwt14Z+5EFIYxFqR 50QtCe2gScziBNykGMyOGn7gyt98ZH8Te258asM/4TeTixRd6zq7qDAPTtIkK9aSd96/ mfXoS0snwlNoLwCZkLR6vdb569w6dAIaB+dxPoh97n8byrZcMg78Nv5jsvnMLI75YLKu 4fnQ==",
                    "x-forwarded-encrypted": "i=2; AJvYcCWyWJR69R7UfUh0074MT8W0OYgxZw1YWcgWzsfVB8ACx5uXQ6XoZCoDYLoG7+2tLap7ucI/bejRQxo8j0pfgBVjaVHJyAGZQdvw3k6WhfCj0w==@hook.eu2.make.com",
                    "x-gm-message-state": "AOJu0YzU3yubBl72NilgtNUSMF6FreYjCqsGCb/CP/i+PzskNEzLf6V0 NhdgmKxoXN+rwxQNUAGOIHjddztuSMjOwgoiQaa2nZJUOL8tVJQvC7ynUZCVM9CGkbmBMW0WguR 7YxGyslz49bYECM0kI9bNMgcN1TKyhuLx55t7F+H2ZRxD+kSopjGMYuYvixodyjRJ6YfptNq3To obTnOzccg=",
                    "x-received": [
                        "by 2002:a05:6808:7006:b0:43f:1ae3:78f1 with SMTP id 5614622812f47-443a2f2a7famr9649521b6e.20.1761127050761; Wed, 22 Oct 2025 02:57:30 -0700 (PDT)",
                        "by 2002:a17:907:84b:b0:b40:98b1:7457 with SMTP id a640c23a62f3a-b647423d7e8mr2511349166b.47.1761127047385; Wed, 22 Oct 2025 02:57:27 -0700 (PDT)",
                        "by 2002:a17:906:258f:b0:b65:dafc:cd0a with SMTP id a640c23a62f3a-b65dafccd66mr1583953466b.52.1761127046012; Wed, 22 Oct 2025 02:57:26 -0700 (PDT)"
                    ],
                    "x-forwarded-to": "6s4v72vyjfwwddfmfkebj3ka5e8cvh6u@hook.eu2.make.com, hd9r2awqnjjrcduwc4cgxlgqze1bbstj@hook.eu2.make.com",
                    "x-forwarded-for": "m.skinner@make.com 6s4v72vyjfwwddfmfkebj3ka5e8cvh6u@hook.eu2.make.com, hd9r2awqnjjrcduwc4cgxlgqze1bbstj@hook.eu2.make.com",
                    "delivered-to": "<m.skinner+paystreaminbox@make.com>",
                    "return-path": "",
                    "received-spf": "pass (google.com: domain of m.skinner@make.com designates 209.85.220.41 as permitted sender) client-ip=209.85.220.41;",
                    "authentication-results": "mx.google.com; dkim=pass header.i=@make-com.20230601.gappssmtp.com header.s=20230601 header.b=sLinQ9Hx; spf=pass (google.com: domain of m.skinner@make.com designates 209.85.220.41 as permitted sender) smtp.mailfrom=m.skinner@make.com; dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=make.com; dara=neutral header.i=@make.com",
                    "dkim-signature": "v=1; a=rsa-sha256; c=relaxed/relaxed; d=make-com.20230601.gappssmtp.com; s=20230601; t=1761127046; x=1761731846; darn=make.com; h=mime-version:date:message-id:subject:to:from:from:to:cc:subject :date:message-id:reply-to; bh=1hqCCQEEIMzyHi08QMVsNbqRV3T7zbve5nvxVJsRuIA=; b=sLinQ9Hx8nWGsWLfZWEyyRTd8Fe5cRNwRL55S8Cwivt7YOb+Gvj7w6NC9RbApYnwKO AFjqsDbCRpI2sAZlM3ukhKahge4qX8DFGBU8lMw0LpBrJm1OImNwuDJmsOpOL4AXUXtE DeuSMBortb/k93abwSU3KIuyPvoNYJg8lwmLa4QEBn5+0QcHFDDzAkU9qsa9bsa3PckE Wg8e9/LCluaBq8LWRDiLLfA4LKHR4/DPaLi1u2u3C4RLW1R/yK6nxiI2Z/eydNiB4QBU SlS4bwitk9nlfNQ5smilv2QE8Q6utwS1K7BriZhRR0CfleETFC5gtzx3d6iQv5LRadEL JzJg==",
                    "x-gm-gg": "ASbGncvygZVynzloTEyWnLSUm7mIFmACSR2nVScucz0VSAXbxrTCfJcgu1BuuaD4t9t adwTDJA5N3P+pKUchrDPtFld07lDJwzGzd00KrxYRUA17nfRDN+QB50UyIxhNpI4C83AA2Rhsyr qDUeB8WUvBrAe3PU1qhq9IMw4zLemYTx9UzumAnlkdjEhyhOnr826FBZz1AbmbBc34PfY15+o4V VZ97JxAvaZVy5uX0+MGozRkTfIlrZ93nvMsS4l/4fN6Z71oJ9TwIqX7dHqvf0bo6UV6XKmbYkJp HTZcafB9SEzcuX/pGPDSYn601HGUUXKaCTZF3MGJM+fm3csEj04g9PxJpLMXjn9PSYtbIm6H9Y4 aPwBxsgP98LHyTuaOKtc/gjVnzd/JwqYsRSSBWsyBOnTCLjw1JR6m9RE+88gSsQb1lFxoFLnqxN vyVN+Md4TrzLJkLjjL+MPf8VOob7yF/yB4U5RuJuZm1oK5+ydedrpLGf7FYtBZSsOG36KmnK/45 ZA1pnbOWByAW577C7WuHYkCY3ceeTWoBeLeTn25NwfARXzTQl/yULtuFfWLZTvdHNk6FAtEkU9t MNq9mFDuGoRdtWEeBQ==",
                    "x-google-smtp-source": "AGHT+IH1mvLyzSJxKD2hkhwFrtSaaxka2ZtkXUpW77RkxQ3u/X3Gz7N8vzkKImcSGMq59DVTlDqHlA==",
                    "from": "<m.skinner@make.com>",
                    "to": "<m.skinner+paystreaminbox@make.com>",
                    "subject": "New assignment schedule",
                    "message-id": "<cc3a1de1-e575-cea1-9384-fe0a9441ae56@make.com>",
                    "date": "Wed, 22 Oct 2025 09:57:24 GMT",
                    "mime-version": "1.0",
                    "content-type": "multipart/mixed; boundary=--_NmP-70b7ff6d6bbc5e00-Part_1"
                },
                "subject": "New assignment schedule",
                "response": "{\"worker_name\":\"Charlotte Hayes\",\"agency_name\":\"Harvey Nash Limited\",\"end_client_name\":\"Opencast Software Limited\",\"job_title\":null,\"assignment_start_date\":\"2025-10-29\",\"assignment_end_date\":\"2026-01-30\",\"pay_rate\":\"£500.00\",\"notice_period\":\"1 week\",\"number_of_holidays\":\"N/A\",\"pay_period\":\"Day\"}"
            }
        ],
        "__IMTAGGLENGTH__": 1
    }
])
        }
    };

    // 2. Simulate the callback function that Make.com provides.
    const localCallback = (error, result) => {
        console.log("\n--- LOCAL TEST RESULT ---");
        if (error) {
            console.error("Error:", error);
        } else {
            console.log("Success! Rendered HTML:\n");
            console.log(result.emailHtml);
        }
    };

    // 3. Execute the run function with the simulated data.
    run(testInput, localCallback);
}

