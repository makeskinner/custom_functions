/**
 * Processes various Gmail payload formats to extract and decode key information.
 * This definitive version includes a self-contained Base64 decoder to bypass
 * any non-standard behavior in the Make.com JavaScript environment.
 *
 * @param {object|Array|string} input The input from the Make.com module.
 * @returns {Object} An object containing the extracted and decoded email details.
 */
function processGmailPayload(input) {
  let data = input;

  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return { error: "Input was a string but could not be parsed as JSON: " + e.message };
    }
  }

  let email;
  if (Array.isArray(data)) {
    if (data[0] && data[0].array && data[0].array[0]) {
      email = data[0].array[0];
    } else {
      email = data[0];
    }
  } else if (typeof data === 'object' && data !== null) {
    email = data;
  }
  
  if (!email || !email.id || !email.payload) {
    return { error: "Could not find a valid email object in the provided data." };
  }
  
  // --- Self-Contained Base64 Decoder ---
  // This custom decoder avoids using the environment's potentially faulty atob() function.
  const base64Decoder = {
    lookup: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
    decode: function(a) {
      let b = "", c, d, e, f, g, h = 0, i = 0;
      a = a.replace(/[^\w\+\/\=]/g, "");
      do {
        e = this.lookup.indexOf(a.charAt(h++));
        f = this.lookup.indexOf(a.charAt(h++));
        g = this.lookup.indexOf(a.charAt(h++));
        c = this.lookup.indexOf(a.charAt(h++));
        d = e << 18 | f << 12 | g << 6 | c;
        e = d >> 16 & 255;
        f = d >> 8 & 255;
        g = d & 255;
        b += g === 64 ? String.fromCharCode(e, f) : c === 64 || g === 64 ? String.fromCharCode(e) : String.fromCharCode(e, f, g);
      } while (h < a.length);
      return b;
    }
  };
  
  const isBase64 = (str) => {
    if (typeof str !== 'string' || !str || str.includes(' ')) {
      return false;
    }
    const base64Regex = /^[A-Za-z0-9\-_=]+$/;
    return str.length % 4 === 0 && base64Regex.test(str);
  };

  const decodeBase64UrlSafe = (str) => {
    if (!isBase64(str)) {
      return str;
    }
    try {
      let standardBase64 = str.replace(/-/g, '+').replace(/_/g, '/');
      // Use our custom, self-contained decoder instead of atob()
      const decoded = base64Decoder.decode(standardBase64);
      // UTF-8 Clean up
      return decodeURIComponent(escape(decoded));
    } catch (e) {
      return str;
    }
  };

  const getHeader = (headers, name) => {
    if (!headers) return null;
    const lowerCaseName = name.toLowerCase();
    if (Array.isArray(headers)) {
      const header = headers.find(h => h.name && h.name.toLowerCase() === lowerCaseName);
      return header ? header.value : null;
    } else if (typeof headers === 'object' && headers !== null) {
      const headerKey = Object.keys(headers).find(k => k.toLowerCase() === lowerCaseName);
      return headerKey ? headers[headerKey] : null;
    }
    return null;
  };

  const findBodyPartsRecursive = (parts) => {
    let plainBody = null;
    let htmlBody = null;
    if (!parts) return { plainBody, htmlBody };
    for (const part of parts) {
      if (plainBody && htmlBody) break;
      if (part.mimeType.startsWith('multipart/')) {
        const nestedBodies = findBodyPartsRecursive(part.parts);
        if (!plainBody && nestedBodies.plainBody) plainBody = nestedBodies.plainBody;
        if (!htmlBody && nestedBodies.htmlBody) htmlBody = nestedBodies.htmlBody;
      }
      if (part.mimeType === 'text/plain' && !plainBody && part.body && part.body.data) {
        plainBody = part.body.data;
      }
      if (part.mimeType === 'text/html' && !htmlBody && part.body && part.body.data) {
        htmlBody = part.body.data;
      }
    }
    return { plainBody, htmlBody };
  };

  const receivedDate = email.internalDate;
  const fromHeader = getHeader(email.payload.headers, 'From');
  const toHeader = getHeader(email.payload.headers, 'To');
  const ccHeader = getHeader(email.payload.headers, 'CC');
  const toList = toHeader ? toHeader.split(',').map(e => e.trim()) : [];
  const ccList = ccHeader ? ccHeader.split(',').map(e => e.trim()) : [];
  const myEmail = 'm.skinner@make.com';
  const isDirectlyAddressed = toHeader ? toHeader.includes(myEmail) : false;
  const emailId = email.id;
  const emailUrl = `https://mail.google.com/mail/u/0/#inbox/${emailId}`;
  const hasRequiredLabels = Array.isArray(email.labelIds) && (email.labelIds.includes('CATEGORY_PERSONAL') || email.labelIds.includes('IMPORTANT'));
  const isMessageAddedEvent = email.eventType === 'messageAdded';
  const isImportantOrPersonalEvent = hasRequiredLabels && isMessageAddedEvent;
  const snippet = email.snippet;
  const { plainBody, htmlBody } = findBodyPartsRecursive(email.payload.parts);

  return {
    from: fromHeader,
    toList,
    ccList,
    receivedDate,
    isDirectlyAddressed,
    emailId,
    emailUrl,
    isImportantOrPersonalEvent,
    snippet,
    emailBody: {
      plainText: decodeBase64UrlSafe(plainBody),
      html: decodeBase64UrlSafe(htmlBody),
    },
  };
}

// Example of how to run the function with your provided data.
// In Make.com, you would map the Gmail module's output to the 'data' parameter.
const gmailPayload = [
{
            "id": "197d666bb11a55a6",
            "threadId": "197d5fc70d0c9632",
            "labelIds": [
                "IMPORTANT",
                "CATEGORY_PERSONAL",
                "INBOX"
            ],
            "snippet": "Hi Matt, Thanks for letting us know, and no apologies needed at all. These things happen, especially before a weekend and holiday. Most importantly, I hope you and your family have a fantastic and very",
            "payload": {
                "partId": "",
                "mimeType": "multipart/related",
                "filename": "",
                "headers": {
                    "Delivered-To": "m.skinner@make.com",
                    "Received": "from mail-sor-f41.google.com (mail-sor-f41.google.com. [209.85.220.41])        by mx.google.com with SMTPS id 2adb3069b0e04-5563849d6d5sor535247e87.22.2025.07.04.10.05.46        for <m.skinner@make.com>        (Google Transport Security);        Fri, 04 Jul 2025 10:05:46 -0700 (PDT)",
                    "X-Received": "by 2002:a05:6512:3e1b:b0:553:35e6:393b with SMTP id 2adb3069b0e04-556e684bda8mr1168752e87.45.1751648745203; Fri, 04 Jul 2025 10:05:45 -0700 (PDT)",
                    "ARC-Seal": "i=1; a=rsa-sha256; t=1751648746; cv=none;        d=google.com; s=arc-20240605;        b=gEL1dyFAdXIqPJ3nKJAGgHQL4p+0WQsv43JQtEIqWs7xE0GP5vamTjvLyr73pMrOoS         ApBf1KSVEo5vkFV+nKgQtfjoueHY7lF3R+6Q7XYOYWK/dppf6g4Hueui055T2eBMB3So         ad5NlcdOPvigrw6nqzhZ4tjYqrNqFal0YVzGQadT90AnO7o1cTfNFYh2i2qVfT9N9qjw         zcnogEm5o9VXW13lA8RSoZHsZYcpA55ypuDyQa/NOoQobNlpzBTf50gBu7aMpdlpQNzH         KtnjhGHBCUtKYnnS8XDC3uyih/9JYk2XlcTgIiVQidFj+MO7dZVsxWqvvqPGW5J6WG2G         UyqQ==",
                    "ARC-Message-Signature": "i=1; a=rsa-sha256; c=relaxed/relaxed; d=google.com; s=arc-20240605;        h=cc:to:subject:message-id:date:from:in-reply-to:references         :mime-version:dkim-signature;        bh=BVRZND1wgofKfdASbQLud85bdrfUPfZsNXdlq3M/D3U=;        fh=yDcSvEQuUPxWxE1mKUbboxuXwV2IigUKQi+A98QRglM=;        b=f1wh7FTIzfpQotNOpiAvLc69+lYPu1vSK9KxPTNPejYc2ApMq9RdjwdWjfwybTRKmz         MSrurwfB+Q80SrCkGdTpG7hJCQ1WJ7Gcy2WtNOFnEeN8n/lo8agPN78+UFxvOQ2W3ZN4         /TbION2iHtNcJNsuVfGXjPzBb0qm89jJFikA4P95ci+lGXm15PeceH/8bjeE59eKenvd         d+fFPw9nIuJEc0Z1CGuMmer5dMB1CW/4Ku18PLg79xGqJZYgYS70uB8eDYJeviO83tLJ         wzAylUeb7C1hgAeue/j/C3/RI2/U15ibYoW5H+kiTFup6XjqQP/SQLPL7xY1+SJBlSuB         3kew==;        dara=google.com",
                    "ARC-Authentication-Results": "i=1; mx.google.com;       dkim=pass header.i=@make-com.20230601.gappssmtp.com header.s=20230601 header.b=D49YK1L6;       spf=pass (google.com: domain of c.cheng@make.com designates 209.85.220.41 as permitted sender) smtp.mailfrom=c.cheng@make.com;       dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=make.com;       dara=neutral header.i=@make.com",
                    "Return-Path": "<c.cheng@make.com>",
                    "Received-SPF": "pass (google.com: domain of c.cheng@make.com designates 209.85.220.41 as permitted sender) client-ip=209.85.220.41;",
                    "Authentication-Results": "mx.google.com;       dkim=pass header.i=@make-com.20230601.gappssmtp.com header.s=20230601 header.b=D49YK1L6;       spf=pass (google.com: domain of c.cheng@make.com designates 209.85.220.41 as permitted sender) smtp.mailfrom=c.cheng@make.com;       dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=make.com;       dara=neutral header.i=@make.com",
                    "DKIM-Signature": "v=1; a=rsa-sha256; c=relaxed/relaxed;        d=make-com.20230601.gappssmtp.com; s=20230601; t=1751648746; x=1752253546; darn=make.com;        h=cc:to:subject:message-id:date:from:in-reply-to:references         :mime-version:from:to:cc:subject:date:message-id:reply-to;        bh=BVRZND1wgofKfdASbQLud85bdrfUPfZsNXdlq3M/D3U=;        b=D49YK1L6tIv5ZkT9ZtJ7vgV3FaF9EExvXLZCE4uO4HTgnRU/2yAaWaKBojw8+QDjRa         s6G7bIAwFN9vV7cCmiJqvoIYV4V+nOnH0Qk86tD9+PNyEnoac/RfjbTXjYypEklWuvSD         AcZM6+WmeYWVnL7dK5tCxmbFbl2iIKCPD7fXhQUgBOC0WHsHK/l66SJKqrBS1rQ5dRU+         jlTqZuKxNiCbGUcDz5jW2Ek4AlJ9IrHht4YoT1cQxg9hr98cp5EZkvEibVkGEs+UTvRt         SPJni+geTXhnztlLlTJhueQDOvSqoSBLsTEyE517XdCZOPKPgY8pCTG7V/FCB11F7MjU         ZOJg==",
                    "X-Google-DKIM-Signature": "v=1; a=rsa-sha256; c=relaxed/relaxed;        d=1e100.net; s=20230601; t=1751648746; x=1752253546;        h=cc:to:subject:message-id:date:from:in-reply-to:references         :mime-version:x-gm-message-state:from:to:cc:subject:date:message-id         :reply-to;        bh=BVRZND1wgofKfdASbQLud85bdrfUPfZsNXdlq3M/D3U=;        b=G4IwLLnjLJv+a7ta6INWyG1rebWxIp1+IsC8FtH+JFQXzpl/hvM/yUTifSIr3au2us         nFDpcnIsAH/KZGq91OBjseS4efE2a0U4RJpB/qPdxlT0K98Zi1xTrzd6ar59AWXXzcaM         yA4ukH/jegHw5n/hIyHqh6ESqVBZ/eWrzL2PByHm8c13Q2tYgEfdsupl3523VVs3yxJq         PLO+NCT0Yj+9afimIgah4y5VSaAg8/0prdBBQ5O4jeeU9d+K+iV39RxOyvu4SPbgUcah         StesmKsjXEfFVUMfHs2IUMJQNNA2UdAgsM87CSNCzay2U31BrSOKGWT9dI/Xv3TuW9U2         Hqcw==",
                    "X-Gm-Message-State": "AOJu0Yzd8ZYLtz6Wd4UgDyLQ9uoGerBbjkFuj+Hm9tTv/u7/jQpSYH5V jPCRkNuAdmmh7lWmypjXZmCNOjWi7tfiSEH8JT81MCEgxaoH5RR/VRzbJ1lg0TWEb/tJ6CuI5GL nXI2xNiRvdigGxBpb83oTHQetZ4zM2KJjzPAQHZ1MgRlXXVI6iAUzw2ozKwak",
                    "X-Gm-Gg": "ASbGncu/68FRfEUPf2t8aLhpDz8NKUKC7p7bTI9oMpbwx38gYgon6p3NHGfpSjL4C4o tCzxr1ITM2muXRr/UcyUq6vAl08aHN+Utm1fyV+6+/IkVCjlpl2tDbWmDSeKVRArIuB2G4ujS/z ijsNEmiQebtXCj6Np1rlDiSMCo7myQWgevh5k1Mq6gzRld6qjlx2heuBhh4mTJL6KYJjf9VAE73 7FR",
                    "X-Google-Smtp-Source": "AGHT+IGKnSzeHp3kSAfDnsognEBY4MzDEKNDEzGIO0Mruyab8J7ZumHNq7oXjtg+SLNdSP95n3NsCy1VGSkmn3aK3LY=",
                    "MIME-Version": "1.0",
                    "References": "<CAHKH294Q9SmqGcAOCy42r4DB3GFTD8OhVBiGeMKRDtGBVERgmA@mail.gmail.com> <CAHKH2944wTsCTdbB82kZKVkxk4+dP7PDRc4BqYXGL-3GNQ3psg@mail.gmail.com> <LO0P265MB4829EB0945B268261CCBA3E1B842A@LO0P265MB4829.GBRP265.PROD.OUTLOOK.COM>",
                    "In-Reply-To": "<LO0P265MB4829EB0945B268261CCBA3E1B842A@LO0P265MB4829.GBRP265.PROD.OUTLOOK.COM>",
                    "From": "Chi-Han Cheng <c.cheng@make.com>",
                    "Date": "Fri, 4 Jul 2025 18:05:08 +0100",
                    "X-Gm-Features": "Ac12FXx0NM6q_Bp3cHham7Jso1yPS-UMh7NDCQGBqx-UJ8UaCriTU2z33v6vTMU",
                    "Message-ID": "<CAHKH296E3KEQQC54wHbEA0JWRcPE6kvaO5d3x_VpBr28KEBJLA@mail.gmail.com>",
                    "Subject": "Re: Make + The Surgical Consortium: Scenario review @ Fri, 4 Jul 2025 4:00pm – 5:00pm (GMT+01)",
                    "To": "Matthew Fysh <mfysh@thesurgicalconsortium.com>",
                    "Cc": "Mark Skinner <m.skinner@make.com>",
                    "Content-Type": "multipart/related; boundary=\"0000000000003ae3d306391d81ba\""
                },
                "body": {
                    "size": 0
                },
                "parts": [
                    {
                        "partId": "0",
                        "mimeType": "multipart/alternative",
                        "filename": "",
                        "headers": {
                            "Content-Type": "multipart/alternative; boundary=\"0000000000003ae3d006391d81b9\""
                        },
                        "body": {
                            "size": 0
                        },
                        "parts": [
                            {
                                "partId": "0.0",
                                "mimeType": "text/plain",
                                "filename": "",
                                "headers": [
                                    {
                                        "name": "Content-Type",
                                        "value": "text/plain; charset=\"UTF-8\""
                                    },
                                    {
                                        "name": "Content-Transfer-Encoding",
                                        "value": "quoted-printable"
                                    }
                                ],
                                "body": {
                                    "size": 3630,
                                    "data": "SGkgTWF0dCwNCg0KVGhhbmtzIGZvciBsZXR0aW5nIHVzIGtub3csIGFuZCBubyBhcG9sb2dpZXMgbmVlZGVkIGF0IGFsbC4gVGhlc2UgdGhpbmdzDQpoYXBwZW4sIGVzcGVjaWFsbHkgYmVmb3JlIGEgd2Vla2VuZCBhbmQgaG9saWRheS4NCg0KTW9zdCBpbXBvcnRhbnRseSwgSSBob3BlIHlvdSBhbmQgeW91ciBmYW1pbHkgaGF2ZSBhIGZhbnRhc3RpYyBhbmQgdmVyeQ0Kd2VsbC1kZXNlcnZlZCB0aHJlZS13ZWVrIGhvbGlkYXkgaW4gU2ljaWx5ISBJdCBzb3VuZHMgbGlrZSBhbiBhbWF6aW5nIHRyaXAuDQoNCkxldCdzIHJlc2NoZWR1bGUgdGhlIHNlc3Npb24gd2l0aCBNYXJrIHdoZW4geW91IGFyZSBiYWNrIGFuZCBzZXR0bGVkIGluLg0KSnVzdCBsZXQgbWUga25vdyB3aGF0IHdvcmtzIGJlc3QgZm9yIHlvdSB0aGVuLg0KDQpFbmpveSB0aGUgYnJlYWshDQoNCkJlc3QgcmVnYXJkcywNCkNoaS1IYW4NCg0KDQoqQ2hpLUhhbiBDaGVuZyoNCkVudGVycHJpc2UgQWNjb3VudCBFeGVjdXRpdmUNCis0NCAoMCkgNzg3MSA4MjEzNzgNCg0K4ZCnDQoNCk9uIEZyaSwgNCBKdWwgMjAyNSBhdCAxNjo0NywgTWF0dGhldyBGeXNoIDxtZnlzaEB0aGVzdXJnaWNhbGNvbnNvcnRpdW0uY29tPg0Kd3JvdGU6DQoNCj4gSGkgQm90aCwNCj4NCj4gU2luY2VyZSBhcG9sb2dpZXMgZm9yIG1pc3NpbmcgdGhlIGNhbGwuIEkgd2FzIGRlYWxpbmcgd2l0aCBhIHByZS13ZWVrZW5kDQo-IGlzc3VlIGFuZCBjb21wbGV0ZWx5IG1pc3NlZCB0aGlzIHJlbWluZGVyLg0KPg0KPiBJIGhvcGUgSSBkaWRu4oCZdCB3YWtlIHRvbyBtdWNoIG9mIHlvdXIgdGltZS4gSSB3aWxsIHJlc2NoZWR1bGUgd2hlbiBJIGFtDQo-IGJhY2sgaW4gdGhlIG9mZmljZS4NCj4NCj4gS2luZCBSZWdhcmRzLA0KPiBNYXR0DQo-DQo-IE1hdHRoZXcgRnlzaA0KPiBNYW5hZ2luZyBEaXJlY3Rvcg0KPiB0aGVzdXJnaWNhbGNvbnNvcnRpdW0uY29tDQo-IFQgICs0NCgwKTIwIDc2NjQgNTEyNiA8KzQ0KDApMjAlMjA3NjY0JTIwNTEyNj4NCj4gRCAgKzQ0KDApMTM3MSA1MTIgMDA2IDwrNDQoMCkxMzcxJTIwNTEyJTIwMDA2Pg0KPiBUaGlzIGVtYWlsIGFuZCBhbnkgZmlsZXMgdHJhbnNtaXR0ZWQgd2l0aCBpdCBhcmUgY29uZmlkZW50aWFsLiBJZiB5b3UgYXJlDQo-IG5vdCB0aGUgaW50ZW5kZWQgcmVjaXBpZW50LCBhbnkgcmVhZGluZywgcHJpbnRpbmcsIHN0b3JhZ2UsIGRpc2Nsb3N1cmUsDQo-IGNvcHlpbmcgb3IgYW55IG90aGVyDQo-IOKAi2FjdGlvbiB0YWtlbiBpbiByZXNwZWN0IG9mIHRoaXMgZW1haWwgaXMgcHJvaGliaXRlZCBhbmQgbWF5IGJlIHVubGF3ZnVsLg0KPiDigItJZiB5b3UgYXJlIG5vdCB0aGUgaW50ZW5kZWQgcmVjaXBpZW50LCBwbGVhc2Ugbm90aWZ5IHRoZSBzZW5kZXINCj4gaW1tZWRpYXRlbHkgYnkgdXNpbmcgdGhlDQo-IOKAi3JlcGx5IGZ1bmN0aW9uIGFuZCB0aGVuIHBlcm1hbmVudGx5IGRlbGV0ZSB3aGF0IHlvdSBoYXZlIHJlY2VpdmVkLiBUaGUNCj4gU3VyZ2ljYWwgQ29uc29ydGl1bSBMdGQgaXMgYSBwcml2YXRlIGxpbWl0ZWQgY29tcGFueSByZWdpc3RlcmVkIGluIEVuZ2xhbmQNCj4gYW5kIFdhbGVzDQo-IOKAi3dpdGggcmVnaXN0ZXJlZCBudW1iZXIgMTMxOTgwMTIgd2hvc2UgcmVnaXN0ZXJlZCBvZmZpY2UgaXMgYXQgVW5pdCAxOSwNCj4gT2xkIFBhcmsgRmFybSwgRm9yZCBFbmQsIEVzc2V4LCBDTTMgMUxOLg0KPg0KPiAqRnJvbTogKkNoaS1IYW4gQ2hlbmcgPGMuY2hlbmdAbWFrZS5jb20-DQo-ICpEYXRlOiAqRnJpZGF5LCA0IEp1bHkgMjAyNSBhdCAxNjoxMQ0KPiAqVG86ICpNYXR0aGV3IEZ5c2ggPG1meXNoQHRoZXN1cmdpY2FsY29uc29ydGl1bS5jb20-DQo-ICpDYzogKk1hcmsgU2tpbm5lciA8bS5za2lubmVyQG1ha2UuY29tPg0KPiAqU3ViamVjdDogKlJlOiBNYWtlICsgVGhlIFN1cmdpY2FsIENvbnNvcnRpdW06IFNjZW5hcmlvIHJldmlldyBAIEZyaSwgNA0KPiBKdWwgMjAyNSA0OjAwcG0g4oCTIDU6MDBwbSAoR01UKzAxKQ0KPg0KPiDimqAgQ0FVVElPTjogVGhpcyBlbWFpbCBvcmlnaW5hdGVkIGZyb20gb3V0c2lkZSBvZiB0aGUgb3JnYW5pc2F0aW9uLiBEbyBub3QNCj4gY2xpY2sgbGlua3Mgb3Igb3BlbiBhdHRhY2htZW50cyB1bmxlc3MgeW91IHJlY29nbmlzZSB0aGUgc2VuZGVyIGFuZCBrbm93DQo-IHRoZSBjb250ZW50IGlzIHNhZmUuDQo-IE1hdHQgLQ0KPiBzaGFyaW5nIHRoZSBsaW5rIG5vdw0KPiBodHRwczovL2NlbG9uaXMuem9vbS51cy9qLzk3MzIyMTc0MDIzP3B3ZD1kZHE1UFBIaHpiWHB0dzhMOER5SmowWDk0TTJUTEQuMSZqc3Q9Mg0KPg0KPiBCZXN0LA0KPg0KPiAqQ2hpLUhhbiBDaGVuZyoNCj4gRW50ZXJwcmlzZSBBY2NvdW50IEV4ZWN1dGl2ZQ0KPiArNDQgKDApIDc4NzEgODIxMzc4DQo-DQo-IOGQpw0KPg0KPiBPbiBGcmksIDQgSnVsIDIwMjUgYXQgMTY6MDksIENoaS1IYW4gQ2hlbmcgPGMuY2hlbmdAbWFrZS5jb20-IHdyb3RlOg0KPg0KPiBIaSBNYXR0LA0KPg0KPiBXZSBhcmUgbG9nZ2VkIGluIHRvIHRoZSBjYWxsOg0KPg0KPg0KPiBodHRwczovL2NlbG9uaXMuem9vbS51cy9qLzk3MzIyMTc0MDIzP3B3ZD1kZHE1UFBIaHpiWHB0dzhMOER5SmowWDk0TTJUTEQuMSZqc3Q9Mg0KPiA8aHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS91cmw_cT1odHRwczovL2NlbG9uaXMuem9vbS51cy9qLzk3MzIyMTc0MDIzP3B3ZCUzRGRkcTVQUEhoemJYcHR3OEw4RHlKajBYOTRNMlRMRC4xJTI2anN0JTNEMiZzYT1EJnNvdXJjZT1jYWxlbmRhciZ1c3Q9MTc1MjA3MzY4MjIyNDg3MSZ1c2c9QU92VmF3MzIyaFZ0QVVXbjItS204aURFWDZsYz4NCj4NCj4gS2luZCByZWdhcmRzLA0KPiBDaGktSGFuDQo-DQo-ICpDaGktSGFuIENoZW5nKg0KPg0KPiBFbnRlcnByaXNlIEFjY291bnQgRXhlY3V0aXZlDQo-DQo-ICs0NCA3ODcxIDgyMSAzNzgNCj4NCj4gYy5jaGVuZ0BtYWtlLmNvbQ0KPg0KPiA8aHR0cHM6Ly84ZmQwYjkxZi5zdHJlYWtsaW5rcy5jb20vQ2ZTeVhqM25KX3FIUDJzRmJRdzZINjJqL2h0dHBzJTNBJTJGJTJGd3d3Lm1ha2UuY29tJTJGPg0KPg0KPiA8aHR0cHM6Ly84ZmQwYjkxZi5zdHJlYWtsaW5rcy5jb20vQ2ZTeVhqM0p5UlAxdmczQzBRYURPUmpKL2h0dHBzJTNBJTJGJTJGdHdpdHRlci5jb20lMkZtYWtlX2hxPg0KPg0KPiA8aHR0cHM6Ly84ZmQwYjkxZi5zdHJlYWtsaW5rcy5jb20vQ2ZTeVhqN3JhMGdIY1JBSVBndUNScEctL2h0dHBzJTNBJTJGJTJGZmFjZWJvb2suY29tJTJGaXRzTWFrZUhRPg0KPg0KPiA8aHR0cHM6Ly84ZmQwYjkxZi5zdHJlYWtsaW5rcy5jb20vQ2ZTeVhqN2VYbWEzWURZTzZBTDhXMjZPL2h0dHBzJTNBJTJGJTJGd3d3LmxpbmtlZGluLmNvbSUyRmNvbXBhbnklMkZpdHNtYWtlaHE-DQo-DQo-IDxodHRwczovLzhmZDBiOTFmLnN0cmVha2xpbmtzLmNvbS9DZlN5WGo3SEJ6aVRmZ3hyZGdjTG9hQVAvaHR0cHMlM0ElMkYlMkZ3d3cuaW5zdGFncmFtLmNvbSUyRml0c21ha2VocSUyRj4NCj4NCj4gPGh0dHBzOi8vOGZkMGI5MWYuc3RyZWFrbGlua3MuY29tL0NmU3lYal8xZGJodG1pbldaUUNOYXg2Vi9odHRwcyUzQSUyRiUyRnd3dy55b3V0dWJlLmNvbSUyRmNoYW5uZWwlMkZVQzhLV1JyZjh3cXlvd21XaFhKOURSalE-DQo-IOGQpw0KPg0KPg0K"
                                }
                            },
                            {
                                "partId": "0.1",
                                "mimeType": "text/html",
                                "filename": "",
                                "headers": [
                                    {
                                        "name": "Content-Type",
                                        "value": "text/html; charset=\"UTF-8\""
                                    },
                                    {
                                        "name": "Content-Transfer-Encoding",
                                        "value": "quoted-printable"
                                    }
                                ],
                                "body": {
                                    "size": 20879,
                                    "data": "PGRpdiBkaXI9Imx0ciI-PGRpdj5IaSBNYXR0LDwvZGl2PjxkaXY-PGJyPlRoYW5rcyBmb3IgbGV0dGluZyB1cyBrbm93LCBhbmQgbm8gYXBvbG9naWVzIG5lZWRlZCBhdCBhbGwuIFRoZXNlIHRoaW5ncyBoYXBwZW4sIGVzcGVjaWFsbHkgYmVmb3JlIGEgd2Vla2VuZCBhbmQgaG9saWRheS48YnI-PGJyPk1vc3QgaW1wb3J0YW50bHksIEkgaG9wZSB5b3UgYW5kIHlvdXIgZmFtaWx5IGhhdmUgYSBmYW50YXN0aWMgYW5kIHZlcnkgd2VsbC1kZXNlcnZlZCB0aHJlZS13ZWVrIGhvbGlkYXkgaW4gU2ljaWx5ISBJdCBzb3VuZHMgbGlrZSBhbiBhbWF6aW5nIHRyaXAuPGJyPjxicj5MZXQmIzM5O3MgcmVzY2hlZHVsZSB0aGUgc2Vzc2lvbiB3aXRoIE1hcmsgd2hlbiB5b3UgYXJlIGJhY2sgYW5kIHNldHRsZWQgaW4uIEp1c3QgbGV0IG1lIGtub3cgd2hhdCB3b3JrcyBiZXN0IGZvciB5b3UgdGhlbi48YnI-PGJyPkVuam95IHRoZSBicmVhayE8YnI-PGJyPkJlc3QgcmVnYXJkcyw8YnI-Q2hpLUhhbjwvZGl2PjxkaXY-PGJyPjwvZGl2PjxkaXY-PGJyPjwvZGl2PjxkaXY-PGRpdiBkaXI9Imx0ciIgY2xhc3M9ImdtYWlsX3NpZ25hdHVyZSIgZGF0YS1zbWFydG1haWw9ImdtYWlsX3NpZ25hdHVyZSI-PGRpdiBkaXI9Imx0ciI-PGIgc3R5bGU9ImNvbG9yOnJnYigwLDAsMCk7Zm9udC1mYW1pbHk6SW50ZXIsQXJpYWwsc2Fucy1zZXJpZjtmb250LXNpemU6MTJweCI-Q2hpLUhhbiBDaGVuZzwvYj48ZGl2PjxzcGFuIHN0eWxlPSJjb2xvcjpyZ2IoMCwwLDApO2ZvbnQtZmFtaWx5OkludGVyLEFyaWFsLHNhbnMtc2VyaWY7Zm9udC1zaXplOjEycHgiPkVudGVycHJpc2UgQWNjb3VudCBFeGVjdXRpdmU8L3NwYW4-PC9kaXY-PGRpdj48c3BhbiBzdHlsZT0iY29sb3I6cmdiKDAsMCwwKTtmb250LWZhbWlseTpJbnRlcixBcmlhbCxzYW5zLXNlcmlmO2ZvbnQtc2l6ZToxMnB4Ij4rNDQgKDApIDc4NzEgODIxMzc4PC9zcGFuPjwvZGl2PjwvZGl2PjwvZGl2PjwvZGl2Pjxicj48L2Rpdj48ZGl2IGhzcGFjZT0ic3RyZWFrLXB0LW1hcmsiIHN0eWxlPSJtYXgtaGVpZ2h0OjFweCI-PGltZyBhbHQ9IiIgc3R5bGU9IndpZHRoOjBweDttYXgtaGVpZ2h0OjBweDtvdmVyZmxvdzpoaWRkZW4iIHNyYz0iaHR0cHM6Ly9tYWlsZm9vZ2FlLmFwcHNwb3QuY29tL3Q_c2VuZGVyPWFZeTVqYUdWdVowQnRZV3RsTG1OdmJRJTNEJTNEJmFtcDt0eXBlPXplcm9jb250ZW50JmFtcDtndWlkPTBkYjBkYTIzLWY0OGMtNDJhNC1hMmQ0LWI3ZDlmYjA3ZTIyMSI-PGZvbnQgY29sb3I9IiNmZmZmZmYiIHNpemU9IjEiPuGQpzwvZm9udD48L2Rpdj48YnI-PGRpdiBjbGFzcz0iZ21haWxfcXVvdGUgZ21haWxfcXVvdGVfY29udGFpbmVyIj48ZGl2IGRpcj0ibHRyIiBjbGFzcz0iZ21haWxfYXR0ciI-T24gRnJpLCA0IEp1bCAyMDI1IGF0IDE2OjQ3LCBNYXR0aGV3IEZ5c2ggJmx0OzxhIGhyZWY9Im1haWx0bzptZnlzaEB0aGVzdXJnaWNhbGNvbnNvcnRpdW0uY29tIj5tZnlzaEB0aGVzdXJnaWNhbGNvbnNvcnRpdW0uY29tPC9hPiZndDsgd3JvdGU6PGJyPjwvZGl2PjxibG9ja3F1b3RlIGNsYXNzPSJnbWFpbF9xdW90ZSIgc3R5bGU9Im1hcmdpbjowcHggMHB4IDBweCAwLjhleDtib3JkZXItbGVmdDoxcHggc29saWQgcmdiKDIwNCwyMDQsMjA0KTtwYWRkaW5nLWxlZnQ6MWV4Ij4NCg0KDQoNCjxkaXY-DQo8ZGl2IGRpcj0ibHRyIiBzdHlsZT0iZm9udC1mYW1pbHk6JnF1b3Q7Q2VudHVyeSBHb3RoaWMmcXVvdDssQXJpYWwsSGVsdmV0aWNhLHNhbnMtc2VyaWY7Zm9udC1zaXplOjlwdCI-DQpIaSBCb3RoLDwvZGl2Pg0KPGRpdiBkaXI9Imx0ciIgc3R5bGU9ImZvbnQtZmFtaWx5OiZxdW90O0NlbnR1cnkgR290aGljJnF1b3Q7LEFyaWFsLEhlbHZldGljYSxzYW5zLXNlcmlmO2ZvbnQtc2l6ZTo5cHQiPg0KPGJyPg0KPC9kaXY-DQo8ZGl2IGRpcj0ibHRyIiBzdHlsZT0iZm9udC1mYW1pbHk6JnF1b3Q7Q2VudHVyeSBHb3RoaWMmcXVvdDssQXJpYWwsSGVsdmV0aWNhLHNhbnMtc2VyaWY7Zm9udC1zaXplOjlwdDtjb2xvcjpyZ2IoMCwwLDApIj4NClNpbmNlcmUgYXBvbG9naWVzIGZvciBtaXNzaW5nIHRoZSBjYWxsLiBJIHdhcyBkZWFsaW5nIHdpdGggYSBwcmUtd2Vla2VuZCBpc3N1ZSBhbmQgY29tcGxldGVseSBtaXNzZWQgdGhpcyByZW1pbmRlci48L2Rpdj4NCjxkaXYgZGlyPSJsdHIiIHN0eWxlPSJmb250LWZhbWlseTomcXVvdDtDZW50dXJ5IEdvdGhpYyZxdW90OyxBcmlhbCxIZWx2ZXRpY2Esc2Fucy1zZXJpZjtmb250LXNpemU6OXB0Ij4NCjxicj4NCjwvZGl2Pg0KPGRpdiBkaXI9Imx0ciIgc3R5bGU9ImZvbnQtZmFtaWx5OiZxdW90O0NlbnR1cnkgR290aGljJnF1b3Q7LEFyaWFsLEhlbHZldGljYSxzYW5zLXNlcmlmO2ZvbnQtc2l6ZTo5cHQ7Y29sb3I6cmdiKDAsMCwwKSI-DQpJIGhvcGUgSSBkaWRu4oCZdCB3YWtlIHRvbyBtdWNoIG9mIHlvdXIgdGltZS4gSSB3aWxsIHJlc2NoZWR1bGUgd2hlbiBJIGFtIGJhY2sgaW4gdGhlIG9mZmljZS48L2Rpdj4NCjxkaXYgZGlyPSJsdHIiIHN0eWxlPSJmb250LWZhbWlseTomcXVvdDtDZW50dXJ5IEdvdGhpYyZxdW90OyxBcmlhbCxIZWx2ZXRpY2Esc2Fucy1zZXJpZjtmb250LXNpemU6OXB0O2NvbG9yOnJnYigwLDAsMCkiPg0KPGJyPg0KPC9kaXY-DQo8ZGl2IGRpcj0ibHRyIiBzdHlsZT0iZm9udC1mYW1pbHk6JnF1b3Q7Q2VudHVyeSBHb3RoaWMmcXVvdDssQXJpYWwsSGVsdmV0aWNhLHNhbnMtc2VyaWY7Zm9udC1zaXplOjlwdDtjb2xvcjpyZ2IoMCwwLDApIj4NCktpbmQgUmVnYXJkcyw8L2Rpdj4NCjxkaXYgZGlyPSJsdHIiIHN0eWxlPSJmb250LWZhbWlseTomcXVvdDtDZW50dXJ5IEdvdGhpYyZxdW90OyxBcmlhbCxIZWx2ZXRpY2Esc2Fucy1zZXJpZjtmb250LXNpemU6OXB0O2NvbG9yOnJnYigwLDAsMCkiPg0KTWF0dDwvZGl2Pg0KPGRpdiBkaXI9Imx0ciIgc3R5bGU9ImZvbnQtZmFtaWx5OiZxdW90O0NlbnR1cnkgR290aGljJnF1b3Q7LEFyaWFsLEhlbHZldGljYSxzYW5zLXNlcmlmO2ZvbnQtc2l6ZTo5cHQ7Y29sb3I6cmdiKDAsMCwwKSI-DQo8YnI-DQo8L2Rpdj4NCjxkaXYgaWQ9Im1fNzUwNTMxMjY3NTk4NzYyNjU2OG1zLW91dGxvb2stbW9iaWxlLXNpZ25hdHVyZSI-DQo8dGFibGUgZGlyPSJsdHIiIGNlbGxzcGFjaW5nPSIwIiBjZWxscGFkZGluZz0iMCIgc3R5bGU9IndpZHRoOjEwMCU7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlci1jb2xsYXBzZTpjb2xsYXBzZTtib3JkZXItc3BhY2luZzowcHgiPg0KPHRib2R5Pg0KPHRyPg0KPHRkIGRpcj0ibHRyIiBhbGlnbj0ibGVmdCIgc3R5bGU9InZlcnRpY2FsLWFsaWduOnRvcCI-DQo8dGFibGUgZGlyPSJsdHIiIGNlbGxzcGFjaW5nPSIwIiBjZWxscGFkZGluZz0iMCIgc3R5bGU9ImJveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7Ym9yZGVyLXNwYWNpbmc6MHB4Ij4NCjx0Ym9keT4NCjx0cj4NCjx0ZCBkaXI9Imx0ciIgYWxpZ249ImxlZnQiIHN0eWxlPSJwYWRkaW5nLWJvdHRvbToxMHB4O3ZlcnRpY2FsLWFsaWduOnRvcCI-DQo8dGFibGUgZGlyPSJsdHIiIGNlbGxzcGFjaW5nPSIwIiBjZWxscGFkZGluZz0iMCIgc3R5bGU9ImJveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7Ym9yZGVyLXNwYWNpbmc6MHB4Ij4NCjx0Ym9keT4NCjx0cj4NCjx0ZCBkaXI9Imx0ciIgYWxpZ249ImxlZnQiIHN0eWxlPSJ2ZXJ0aWNhbC1hbGlnbjp0b3AiPg0KPHRhYmxlIGRpcj0ibHRyIiBjZWxsc3BhY2luZz0iMCIgY2VsbHBhZGRpbmc9IjAiIHN0eWxlPSJ3aWR0aDoxMDAlO2JveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7Ym9yZGVyLXNwYWNpbmc6MHB4Ij4NCjx0Ym9keT4NCjx0cj4NCjx0ZCBkaXI9Imx0ciIgYWxpZ249ImxlZnQiIHN0eWxlPSJwYWRkaW5nLWJvdHRvbTo1cHg7dmVydGljYWwtYWxpZ246dG9wIj4NCjx0YWJsZSBkaXI9Imx0ciIgY2VsbHNwYWNpbmc9IjAiIGNlbGxwYWRkaW5nPSIwIiBzdHlsZT0id2hpdGUtc3BhY2U6bm93cmFwO3dpZHRoOjEwMCU7Y29sb3I6cmdiKDAsMCwxKTtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlO2JvcmRlci1zcGFjaW5nOjBweCI-DQo8dGJvZHk-DQo8dHI-DQo8dGQgZGlyPSJsdHIiIGFsaWduPSJsZWZ0IiBzdHlsZT0id2hpdGUtc3BhY2U6bm93cmFwO3ZlcnRpY2FsLWFsaWduOnRvcCI-DQo8ZGl2IGRpcj0ibHRyIiBzdHlsZT0id2hpdGUtc3BhY2U6bm93cmFwO2ZvbnQtZmFtaWx5OkFyaWFsO2ZvbnQtc2l6ZToxMy4zM3B4O2NvbG9yOnJnYigwLDAsMSkiPg0KPHNwYW4gc3R5bGU9ImZvbnQtd2VpZ2h0OjcwMCI-TWF0dGhld8KgRnlzaDwvc3Bhbj48L2Rpdj4NCjwvdGQ-DQo8L3RyPg0KPHRyPg0KPHRkIGRpcj0ibHRyIiBhbGlnbj0ibGVmdCIgc3R5bGU9IndoaXRlLXNwYWNlOm5vd3JhcDt2ZXJ0aWNhbC1hbGlnbjp0b3AiPg0KPGRpdiBkaXI9Imx0ciIgc3R5bGU9IndoaXRlLXNwYWNlOm5vd3JhcDtmb250LWZhbWlseTpBcmlhbDtmb250LXNpemU6MTAuNjdweDtjb2xvcjpyZ2IoMjIsMTg2LDIzMSkiPg0KTWFuYWdpbmfCoERpcmVjdG9yPC9kaXY-DQo8L3RkPg0KPC90cj4NCjwvdGJvZHk-DQo8L3RhYmxlPg0KPC90ZD4NCjwvdHI-DQo8L3Rib2R5Pg0KPC90YWJsZT4NCjwvdGQ-DQo8L3RyPg0KPHRyPg0KPHRkIGRpcj0ibHRyIiBhbGlnbj0ibGVmdCIgc3R5bGU9ImxpbmUtaGVpZ2h0Om5vcm1hbDtwYWRkaW5nLWJvdHRvbTo0cHg7dmVydGljYWwtYWxpZ246dG9wIj4NCjxzcGFuIHN0eWxlPSJmb250LXNpemU6MHB4Ij48aW1nIHNyYz0iY2lkOmlpXzE5N2Q2NjJkN2RlNzE1Y2JiZTUxIiB3aWR0aD0iMTUwIiBoZWlnaHQ9IjU4IiBzdHlsZT0id2lkdGg6IDE1MHB4OyBoZWlnaHQ6IDU4LjMzcHg7IG1heC13aWR0aDogMTUwcHg7IG1heC1oZWlnaHQ6IDU4LjMzcHg7IG1pbi13aWR0aDogMTUwcHg7IG1pbi1oZWlnaHQ6IDU4LjMzcHg7Ij48L3NwYW4-PC90ZD4NCjwvdHI-DQo8dHI-DQo8dGQgZGlyPSJsdHIiIGFsaWduPSJsZWZ0IiBzdHlsZT0idmVydGljYWwtYWxpZ246dG9wIj4NCjx0YWJsZSBkaXI9Imx0ciIgY2VsbHNwYWNpbmc9IjAiIGNlbGxwYWRkaW5nPSIwIiBzdHlsZT0iYm94LXNpemluZzpib3JkZXItYm94O2JvcmRlci1jb2xsYXBzZTpjb2xsYXBzZTtib3JkZXItc3BhY2luZzowcHgiPg0KPHRib2R5Pg0KPHRyPg0KPHRkIGRpcj0ibHRyIiBhbGlnbj0ibGVmdCIgc3R5bGU9InZlcnRpY2FsLWFsaWduOnRvcCI-DQo8dGFibGUgZGlyPSJsdHIiIGNlbGxzcGFjaW5nPSIwIiBjZWxscGFkZGluZz0iMCIgc3R5bGU9IndoaXRlLXNwYWNlOm5vd3JhcDtjb2xvcjpyZ2IoMCwwLDEpO2JveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7Ym9yZGVyLXNwYWNpbmc6MHB4Ij4NCjx0Ym9keT4NCjx0cj4NCjx0ZCBkaXI9Imx0ciIgYWxpZ249ImxlZnQiIHN0eWxlPSJ3aGl0ZS1zcGFjZTpub3dyYXA7cGFkZGluZy1ib3R0b206M3B4O3ZlcnRpY2FsLWFsaWduOnRvcCI-DQo8ZGl2IGRpcj0ibHRyIiBzdHlsZT0id2hpdGUtc3BhY2U6bm93cmFwO2ZvbnQtZmFtaWx5OkFyaWFsO2ZvbnQtc2l6ZToxMC42N3B4O2NvbG9yOnJnYigwLDAsMSkiPg0KPGEgaHJlZj0iaHR0cDovL3RoZXN1cmdpY2FsY29uc29ydGl1bS5jb20iIHRhcmdldD0iX2JsYW5rIj50aGVzdXJnaWNhbGNvbnNvcnRpdW0uY29tPC9hPjwvZGl2Pg0KPC90ZD4NCjwvdHI-DQo8L3Rib2R5Pg0KPC90YWJsZT4NCjwvdGQ-DQo8L3RyPg0KPHRyPg0KPHRkIGRpcj0ibHRyIiBhbGlnbj0ibGVmdCIgc3R5bGU9InZlcnRpY2FsLWFsaWduOnRvcCI-DQo8dGFibGUgZGlyPSJsdHIiIGNlbGxzcGFjaW5nPSIwIiBjZWxscGFkZGluZz0iMCIgc3R5bGU9ImJveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7Ym9yZGVyLXNwYWNpbmc6MHB4Ij4NCjx0Ym9keT4NCjx0cj4NCjx0ZCBkaXI9Imx0ciIgYWxpZ249ImxlZnQiIHN0eWxlPSJ2ZXJ0aWNhbC1hbGlnbjp0b3AiPg0KPHRhYmxlIGRpcj0ibHRyIiBjZWxsc3BhY2luZz0iMCIgY2VsbHBhZGRpbmc9IjAiIHN0eWxlPSJ3aGl0ZS1zcGFjZTpub3dyYXA7d2lkdGg6MTAwJTtjb2xvcjpyZ2IoMCwwLDEpO2JveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7Ym9yZGVyLXNwYWNpbmc6MHB4Ij4NCjx0Ym9keT4NCjx0cj4NCjx0ZCBkaXI9Imx0ciIgYWxpZ249ImxlZnQiIHN0eWxlPSJ3aGl0ZS1zcGFjZTpub3dyYXA7dmVydGljYWwtYWxpZ246dG9wIj4NCjxkaXYgZGlyPSJsdHIiIHN0eWxlPSJ3aGl0ZS1zcGFjZTpub3dyYXA7Zm9udC1mYW1pbHk6QXJpYWw7Zm9udC1zaXplOjEwLjY3cHg7Y29sb3I6cmdiKDAsMCwxKSI-DQpUwqAgPGEgaHJlZj0idGVsOis0NCgwKTIwJTIwNzY2NCUyMDUxMjYiIGlkPSJtXzc1MDUzMTI2NzU5ODc2MjY1NjhMUGxuazY4OTcxMyIgc3R5bGU9InRleHQtZGVjb3JhdGlvbjpub25lIiB0YXJnZXQ9Il9ibGFuayI-DQorNDQoMCkyMMKgNzY2NMKgNTEyNjwvYT48L2Rpdj4NCjwvdGQ-DQo8L3RyPg0KPHRyPg0KPHRkIGRpcj0ibHRyIiBhbGlnbj0ibGVmdCIgc3R5bGU9IndoaXRlLXNwYWNlOm5vd3JhcDt2ZXJ0aWNhbC1hbGlnbjp0b3AiPg0KPGRpdiBkaXI9Imx0ciIgc3R5bGU9IndoaXRlLXNwYWNlOm5vd3JhcDtmb250LWZhbWlseTpBcmlhbDtmb250LXNpemU6MTAuNjdweDtjb2xvcjpyZ2IoMCwwLDEpIj4NCkTCoCA8YSBocmVmPSJ0ZWw6KzQ0KDApMTM3MSUyMDUxMiUyMDAwNiIgaWQ9Im1fNzUwNTMxMjY3NTk4NzYyNjU2OExQbG5rNjg5NzEzIiBzdHlsZT0idGV4dC1kZWNvcmF0aW9uOm5vbmUiIHRhcmdldD0iX2JsYW5rIj4NCis0NCgwKTEzNzHCoDUxMsKgMDA2PC9hPjwvZGl2Pg0KPC90ZD4NCjwvdHI-DQo8L3Rib2R5Pg0KPC90YWJsZT4NCjwvdGQ-DQo8L3RyPg0KPC90Ym9keT4NCjwvdGFibGU-DQo8L3RkPg0KPC90cj4NCjwvdGJvZHk-DQo8L3RhYmxlPg0KPC90ZD4NCjwvdHI-DQo8L3Rib2R5Pg0KPC90YWJsZT4NCjwvdGQ-DQo8L3RyPg0KPC90Ym9keT4NCjwvdGFibGU-DQo8L3RkPg0KPC90cj4NCjx0cj4NCjx0ZCBkaXI9Imx0ciIgYWxpZ249ImxlZnQiIHN0eWxlPSJ2ZXJ0aWNhbC1hbGlnbjp0b3AiPg0KPHRhYmxlIGRpcj0ibHRyIiBjZWxsc3BhY2luZz0iMCIgY2VsbHBhZGRpbmc9IjAiIHN0eWxlPSJ0ZXh0LWFsaWduOmp1c3RpZnk7d2lkdGg6MTAwJTtjb2xvcjpyZ2IoMTkyLDE5MiwxOTIpO2JveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7Ym9yZGVyLXNwYWNpbmc6MHB4Ij4NCjx0Ym9keT4NCjx0cj4NCjx0ZCBkaXI9Imx0ciIgc3R5bGU9InRleHQtYWxpZ246anVzdGlmeSI-DQo8ZGl2IGRpcj0ibHRyIiBzdHlsZT0idGV4dC1hbGlnbjpqdXN0aWZ5O2ZvbnQtZmFtaWx5OkFyaWFsO2ZvbnQtc2l6ZToxMC42N3B4O2NvbG9yOnJnYigxOTIsMTkyLDE5MikiPg0KVGhpcyBlbWFpbCBhbmQgYW55IGZpbGVzIHRyYW5zbWl0dGVkIHdpdGggaXQgYXJlIGNvbmZpZGVudGlhbC4gSWYgeW91IGFyZSBub3QgdGhlIGludGVuZGVkIHJlY2lwaWVudCwgYW55IHJlYWRpbmcsIHByaW50aW5nLCBzdG9yYWdlLCBkaXNjbG9zdXJlLCBjb3B5aW5nIG9yIGFueSBvdGhlcjxicj4NCuKAi2FjdGlvbiB0YWtlbiBpbiByZXNwZWN0IG9mIHRoaXMgZW1haWwgaXMgcHJvaGliaXRlZCBhbmQgbWF5IGJlIHVubGF3ZnVsLiDigItJZiB5b3UgYXJlIG5vdCB0aGUgaW50ZW5kZWQgcmVjaXBpZW50LCBwbGVhc2Ugbm90aWZ5IHRoZSBzZW5kZXIgaW1tZWRpYXRlbHkgYnkgdXNpbmcgdGhlPGJyPg0K4oCLcmVwbHkgZnVuY3Rpb24gYW5kIHRoZW4gcGVybWFuZW50bHkgZGVsZXRlIHdoYXQgeW91IGhhdmUgcmVjZWl2ZWQuIFRoZSBTdXJnaWNhbCBDb25zb3J0aXVtIEx0ZCBpcyBhIHByaXZhdGUgbGltaXRlZCBjb21wYW55IHJlZ2lzdGVyZWQgaW4gRW5nbGFuZCBhbmQgV2FsZXM8YnI-DQrigIt3aXRoIHJlZ2lzdGVyZWQgbnVtYmVyIDEzMTk4MDEyIHdob3NlIHJlZ2lzdGVyZWQgb2ZmaWNlIGlzIGF0IFVuaXQgMTksIE9sZCBQYXJrIEZhcm0sIEZvcmQgRW5kLCBFc3NleCwgQ00zIDFMTi48L2Rpdj4NCjwvdGQ-DQo8L3RyPg0KPC90Ym9keT4NCjwvdGFibGU-DQo8L3RkPg0KPC90cj4NCjwvdGJvZHk-DQo8L3RhYmxlPg0KPGRpdiBkaXI9Imx0ciIgc3R5bGU9ImZvbnQtc2l6ZToxcHgiPjxzcGFuIHN0eWxlPSJmb250LWZhbWlseTpyZW1pYWxjeGVzYW5zIj7CoDwvc3Bhbj48c3BhbiBzdHlsZT0iZm9udC1mYW1pbHk6dGVtcGxhdGUta3BiWnhxay1FZTI2ZDh4Z3lMSXhYUSI-wqA8L3NwYW4-PHNwYW4gc3R5bGU9ImZvbnQtZmFtaWx5OnpvbmUtMSI-wqA8L3NwYW4-PHNwYW4gc3R5bGU9ImZvbnQtZmFtaWx5OnpvbmVzLUFRIj7CoDwvc3Bhbj48L2Rpdj4NCjwvZGl2Pg0KPGRpdiBpZD0ibV83NTA1MzEyNjc1OTg3NjI2NTY4bWFpbC1lZGl0b3ItcmVmZXJlbmNlLW1lc3NhZ2UtY29udGFpbmVyIj4NCjxkaXYgZGlyPSJsdHIiPjwvZGl2Pg0KPGRpdiBzdHlsZT0idGV4dC1hbGlnbjpsZWZ0O3BhZGRpbmc6M3B0IDBpbiAwaW47Ym9yZGVyLXdpZHRoOjFwdCBtZWRpdW0gbWVkaXVtO2JvcmRlci1zdHlsZTpzb2xpZCBub25lIG5vbmU7Ym9yZGVyLWNvbG9yOnJnYigxODEsMTk2LDIyMykgY3VycmVudGNvbG9yIGN1cnJlbnRjb2xvcjtmb250LWZhbWlseTpBcHRvcztmb250LXNpemU6MTJwdDtjb2xvcjpibGFjayI-DQo8Yj5Gcm9tOiA8L2I-Q2hpLUhhbiBDaGVuZyAmbHQ7PGEgaHJlZj0ibWFpbHRvOmMuY2hlbmdAbWFrZS5jb20iIHRhcmdldD0iX2JsYW5rIj5jLmNoZW5nQG1ha2UuY29tPC9hPiZndDs8YnI-DQo8Yj5EYXRlOiA8L2I-RnJpZGF5LCA0IEp1bHkgMjAyNSBhdCAxNjoxMTxicj4NCjxiPlRvOiA8L2I-TWF0dGhldyBGeXNoICZsdDs8YSBocmVmPSJtYWlsdG86bWZ5c2hAdGhlc3VyZ2ljYWxjb25zb3J0aXVtLmNvbSIgdGFyZ2V0PSJfYmxhbmsiPm1meXNoQHRoZXN1cmdpY2FsY29uc29ydGl1bS5jb208L2E-Jmd0Ozxicj4NCjxiPkNjOiA8L2I-TWFyayBTa2lubmVyICZsdDs8YSBocmVmPSJtYWlsdG86bS5za2lubmVyQG1ha2UuY29tIiB0YXJnZXQ9Il9ibGFuayI-bS5za2lubmVyQG1ha2UuY29tPC9hPiZndDs8YnI-DQo8Yj5TdWJqZWN0OiA8L2I-UmU6IE1ha2UgKyBUaGUgU3VyZ2ljYWwgQ29uc29ydGl1bTogU2NlbmFyaW8gcmV2aWV3IEAgRnJpLCA0IEp1bCAyMDI1IDQ6MDBwbSDigJMgNTowMHBtIChHTVQrMDEpPGJyPg0KPGJyPg0KPC9kaXY-DQo8ZGl2IGlkPSJtXzc1MDUzMTI2NzU5ODc2MjY1NjjigJ1mb290ZXLigJ0iPg0KPHAgc3R5bGU9ImxpbmUtaGVpZ2h0OjEwcHQ7YmFja2dyb3VuZC1jb2xvcjpyZ2IoMjAsMzgsNjgpO3BhZGRpbmc6MnB0O2JvcmRlci13aWR0aDoxcHg7Ym9yZGVyLXN0eWxlOmRvdHRlZDtib3JkZXItY29sb3I6cmdiKDIwLDM4LDY4KTtib3JkZXItcmFkaXVzOjRweDt3aWR0aDoxMDAlO2ZvbnQtZmFtaWx5OkFyaWFsO2ZvbnQtc2l6ZTo5cHQ7Y29sb3I6cmdiKDI1NSwyNTUsMjU1KSI-DQrimqAgQ0FVVElPTjogVGhpcyBlbWFpbCBvcmlnaW5hdGVkIGZyb20gb3V0c2lkZSBvZiB0aGUgb3JnYW5pc2F0aW9uLiBEbyBub3QgY2xpY2sgbGlua3Mgb3Igb3BlbiBhdHRhY2htZW50cyB1bmxlc3MgeW91IHJlY29nbmlzZSB0aGUgc2VuZGVyIGFuZCBrbm93IHRoZSBjb250ZW50IGlzIHNhZmUuPC9wPg0KPC9kaXY-DQo8ZGl2IGRpcj0ibHRyIj5NYXR0IC3CoDwvZGl2Pg0KPGRpdiBkaXI9Imx0ciI-c2hhcmluZyB0aGUgbGluayBub3cNCjxhIGhyZWY9Imh0dHBzOi8vY2Vsb25pcy56b29tLnVzL2ovOTczMjIxNzQwMjM_cHdkPWRkcTVQUEhoemJYcHR3OEw4RHlKajBYOTRNMlRMRC4xJmFtcDtqc3Q9MiIgdGFyZ2V0PSJfYmxhbmsiPg0KaHR0cHM6Ly9jZWxvbmlzLnpvb20udXMvai85NzMyMjE3NDAyMz9wd2Q9ZGRxNVBQSGh6YlhwdHc4TDhEeUpqMFg5NE0yVExELjEmYW1wO2pzdD0yPC9hPjwvZGl2Pg0KPGRpdiBkaXI9Imx0ciI-PGJyPg0KPC9kaXY-DQo8ZGl2IGRpcj0ibHRyIj5CZXN0LDwvZGl2Pg0KPGRpdiBkaXI9Imx0ciI-PGJyPg0KPC9kaXY-DQo8ZGl2IGRpcj0ibHRyIiBjbGFzcz0iZ21haWxfc2lnbmF0dXJlIiBzdHlsZT0iZm9udC1mYW1pbHk6SW50ZXIsQXJpYWwsc2Fucy1zZXJpZjtmb250LXNpemU6MTJweDtjb2xvcjpyZ2IoMCwwLDApIj4NCjxiPkNoaS1IYW4gQ2hlbmc8L2I-PC9kaXY-DQo8ZGl2IGRpcj0ibHRyIiBjbGFzcz0iZ21haWxfc2lnbmF0dXJlIiBzdHlsZT0iZm9udC1mYW1pbHk6SW50ZXIsQXJpYWwsc2Fucy1zZXJpZjtmb250LXNpemU6MTJweDtjb2xvcjpyZ2IoMCwwLDApIj4NCkVudGVycHJpc2UgQWNjb3VudCBFeGVjdXRpdmU8L2Rpdj4NCjxkaXYgZGlyPSJsdHIiIGNsYXNzPSJnbWFpbF9zaWduYXR1cmUiIHN0eWxlPSJmb250LWZhbWlseTpJbnRlcixBcmlhbCxzYW5zLXNlcmlmO2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnJnYigwLDAsMCkiPg0KKzQ0ICgwKSA3ODcxIDgyMTM3ODwvZGl2Pg0KPGRpdiBkaXI9Imx0ciI-PGJyPg0KPC9kaXY-DQo8ZGl2IHN0eWxlPSJtYXgtaGVpZ2h0OjFweCI-DQo8aW1nIHNyYz0iaHR0cHM6Ly9tYWlsZm9vZ2FlLmFwcHNwb3QuY29tL3Q_c2VuZGVyPWFZeTVqYUdWdVowQnRZV3RsTG1OdmJRJTNEJTNEJmFtcDt0eXBlPXplcm9jb250ZW50JmFtcDtndWlkPTNjNmI0NDY1LWU3NzMtNDBhYi1hNzE1LWU1ZDlhMWU4N2JlZiIgc3R5bGU9IndpZHRoOiAwcHg7IG1heC1oZWlnaHQ6IDBweDsiPjxzcGFuIHN0eWxlPSJmb250LXNpemU6MTBweDtjb2xvcjpyZ2IoMjU1LDI1NSwyNTUpIj7hkKc8L3NwYW4-PC9kaXY-DQo8ZGl2IGRpcj0ibHRyIj48YnI-DQo8L2Rpdj4NCjxkaXYgZGlyPSJsdHIiIGNsYXNzPSJnbWFpbF9hdHRyIj5PbiBGcmksIDQgSnVsIDIwMjUgYXQgMTY6MDksIENoaS1IYW4gQ2hlbmcgJmx0OzxhIGhyZWY9Im1haWx0bzpjLmNoZW5nQG1ha2UuY29tIiB0YXJnZXQ9Il9ibGFuayI-Yy5jaGVuZ0BtYWtlLmNvbTwvYT4mZ3Q7IHdyb3RlOjwvZGl2Pg0KPGJsb2NrcXVvdGUgc3R5bGU9Im1hcmdpbjowcHggMHB4IDBweCAwLjhleDtwYWRkaW5nLWxlZnQ6MWV4O2JvcmRlci1sZWZ0OjFweCBzb2xpZCByZ2IoMjA0LDIwNCwyMDQpIj4NCjxkaXYgZGlyPSJsdHIiIGNsYXNzPSJnbWFpbF9xdW90ZSI-SGkgTWF0dCzCoDwvZGl2Pg0KPGRpdiBkaXI9Imx0ciIgY2xhc3M9ImdtYWlsX3F1b3RlIj48YnI-DQo8L2Rpdj4NCjxkaXYgZGlyPSJsdHIiIGNsYXNzPSJnbWFpbF9xdW90ZSI-V2UgYXJlIGxvZ2dlZCBpbiB0byB0aGUgY2FsbDo8L2Rpdj4NCjxkaXYgZGlyPSJsdHIiIGNsYXNzPSJnbWFpbF9xdW90ZSI-PGJyPg0KPC9kaXY-DQo8ZGl2IHN0eWxlPSJwYWRkaW5nLXJpZ2h0OjE2cHg7d2lkdGg6MzA0LjQ0NHB4O21pbi1oZWlnaHQ6NDBweDtkaXNwbGF5OmZsZXgiPg0KPGRpdiBkaXI9Imx0ciIgY2xhc3M9ImdtYWlsX3F1b3RlIiBzdHlsZT0ibGluZS1oZWlnaHQ6MTZweDtwYWRkaW5nLXRvcDo2cHg7cGFkZGluZy1ib3R0b206NnB4O3dpZHRoOjBweDtmb250LXNpemU6MTRweDtjb2xvcjpyZ2IoMTEsODcsMjA4KSI-DQo8YSBocmVmPSJodHRwczovL3d3dy5nb29nbGUuY29tL3VybD9xPWh0dHBzOi8vY2Vsb25pcy56b29tLnVzL2ovOTczMjIxNzQwMjM_cHdkJTNEZGRxNVBQSGh6YlhwdHc4TDhEeUpqMFg5NE0yVExELjElMjZqc3QlM0QyJmFtcDtzYT1EJmFtcDtzb3VyY2U9Y2FsZW5kYXImYW1wO3VzdD0xNzUyMDczNjgyMjI0ODcxJmFtcDt1c2c9QU92VmF3MzIyaFZ0QVVXbjItS204aURFWDZsYyIgc3R5bGU9ImNvbG9yOnJnYigxMSw4NywyMDgpIiB0YXJnZXQ9Il9ibGFuayI-aHR0cHM6Ly9jZWxvbmlzLnpvb20udXMvai85NzMyMjE3NDAyMz9wd2Q9ZGRxNVBQSGh6YlhwdHc4TDhEeUpqMFg5NE0yVExELjEmYW1wO2pzdD0yPC9hPjwvZGl2Pg0KPC9kaXY-DQo8ZGl2IGRpcj0ibHRyIiBjbGFzcz0iZ21haWxfcXVvdGUiPjxicj4NCjwvZGl2Pg0KPGRpdiBkaXI9Imx0ciIgY2xhc3M9ImdtYWlsX3F1b3RlIj5LaW5kIHJlZ2FyZHMsPC9kaXY-DQo8ZGl2IGRpcj0ibHRyIiBjbGFzcz0iZ21haWxfcXVvdGUiPkNoaS1IYW48L2Rpdj4NCjxkaXYgZGlyPSJsdHIiIGNsYXNzPSJnbWFpbF9xdW90ZSI-PGJyPg0KPC9kaXY-DQo8dGFibGUgZGlyPSJsdHIiIGNsYXNzPSJnbWFpbF9zaWduYXR1cmUiIGNlbGxzcGFjaW5nPSIwIiBjZWxscGFkZGluZz0iMCIgc3R5bGU9ImxpbmUtaGVpZ2h0OjE2cHg7Ym9yZGVyLXdpZHRoOm1lZGl1bTtib3JkZXItc3R5bGU6bm9uZTtib3JkZXItY29sb3I6Y3VycmVudGNvbG9yO3RhYmxlLWxheW91dDphdXRvO2NvbG9yOnJnYigwLDAsMCk7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlci1jb2xsYXBzZTpjb2xsYXBzZTtib3JkZXItc3BhY2luZzowcHgiPg0KPHRib2R5Pg0KPHRyPg0KPHRkIGRpcj0ibHRyIiBjbGFzcz0iZ21haWxfc2lnbmF0dXJlIiBhbGlnbj0ibGVmdCIgc3R5bGU9ImxpbmUtaGVpZ2h0OjE2cHg7cGFkZGluZy1ib3R0b206MTVweDt2ZXJ0aWNhbC1hbGlnbjp0b3AiPg0KPHNwYW4gc3R5bGU9ImZvbnQtZmFtaWx5OkludGVyLEFyaWFsLHNhbnMtc2VyaWY7Zm9udC1zaXplOjEycHg7Y29sb3I6cmdiKDAsMCwwKTtiYWNrZ3JvdW5kLWNvbG9yOnJnYigyMzgsMjM4LDIzOCkiPjxpbWcgc3JjPSJodHRwczovL2Nkbi5tYWtlLmNvbS9oci9lbWFpbHNpZ25hdHVyZXMvMjAyNS4wNC4wNyUyMDA1OjI4OjEzLWMuY2hlbmdAbWFrZS5jb21fcmVzaXplZCg1NSkucG5nIiB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHN0eWxlPSJ3aWR0aDogNzJweDsgaGVpZ2h0OiA3MnB4OyBib3JkZXItcmFkaXVzOiA1MCU7Ij48L3NwYW4-PC90ZD4NCjx0ZCBkaXI9Imx0ciIgY2xhc3M9ImdtYWlsX3NpZ25hdHVyZSIgc3R5bGU9ImxpbmUtaGVpZ2h0OjE2cHg7cGFkZGluZzo1cHggMTVweCAxNXB4O3ZlcnRpY2FsLWFsaWduOm1pZGRsZSI-DQo8cCBkaXI9Imx0ciIgY2xhc3M9ImdtYWlsX3NpZ25hdHVyZSIgc3R5bGU9ImxpbmUtaGVpZ2h0OjE2cHg7bWFyZ2luOjBweCAwcHggNnB4Ij4NCjxzcGFuIHN0eWxlPSJmb250LWZhbWlseTpJbnRlcixBcmlhbCxzYW5zLXNlcmlmO2ZvbnQtc2l6ZToxNHB4O2NvbG9yOnJnYigwLDAsMCkiPjxiPkNoaS1IYW4gQ2hlbmc8L2I-PC9zcGFuPjwvcD4NCjxwIGRpcj0ibHRyIiBjbGFzcz0iZ21haWxfc2lnbmF0dXJlIiBzdHlsZT0ibGluZS1oZWlnaHQ6MTZweDttYXJnaW46MHB4IDBweCA2cHgiPg0KPHNwYW4gc3R5bGU9ImZvbnQtZmFtaWx5OkludGVyLEFyaWFsLHNhbnMtc2VyaWY7Zm9udC1zaXplOjEycHg7Y29sb3I6cmdiKDAsMCwwKSI-RW50ZXJwcmlzZSBBY2NvdW50IEV4ZWN1dGl2ZTwvc3Bhbj48L3A-DQo8cCBkaXI9Imx0ciIgY2xhc3M9ImdtYWlsX3NpZ25hdHVyZSIgc3R5bGU9ImxpbmUtaGVpZ2h0OjE2cHg7bWFyZ2luOjBweCAwcHggNnB4Ij4NCjxzcGFuIHN0eWxlPSJmb250LWZhbWlseTpJbnRlcixBcmlhbCxzYW5zLXNlcmlmO2ZvbnQtc2l6ZToxMnB4O2NvbG9yOnJnYigwLDAsMCkiPis0NCA3ODcxIDgyMSAzNzg8L3NwYW4-PC9wPg0KPHAgZGlyPSJsdHIiIGNsYXNzPSJnbWFpbF9zaWduYXR1cmUiIHN0eWxlPSJsaW5lLWhlaWdodDoxNnB4O21hcmdpbjowcHggMHB4IDZweCI-DQo8c3BhbiBzdHlsZT0iZm9udC1mYW1pbHk6SW50ZXIsQXJpYWwsc2Fucy1zZXJpZjtmb250LXNpemU6MTJweDtjb2xvcjpyZ2IoMTA5LDAsMjA0KSI-PGEgaHJlZj0ibWFpbHRvOmMuY2hlbmdAbWFrZS5jb20iIHN0eWxlPSJjb2xvcjpyZ2IoMTA5LDAsMjA0KTttYXJnaW4tdG9wOjBweDttYXJnaW4tYm90dG9tOjBweCIgdGFyZ2V0PSJfYmxhbmsiPmMuY2hlbmdAbWFrZS5jb208L2E-PC9zcGFuPjwvcD4NCjwvdGQ-DQo8L3RyPg0KPHRyPg0KPHRkIGNvbHNwYW49IjIiIGRpcj0ibHRyIiBjbGFzcz0iZ21haWxfc2lnbmF0dXJlIiBhbGlnbj0ibGVmdCIgc3R5bGU9ImxpbmUtaGVpZ2h0OjE2cHg7Ym9yZGVyLXRvcDoxcHggc29saWQgcmdiKDAsMCwwKTtwYWRkaW5nLXRvcDo2cHg7cGFkZGluZy1ib3R0b206NnB4O3ZlcnRpY2FsLWFsaWduOnRvcCI-DQo8ZGl2IHN0eWxlPSJ3aWR0aDoxMDAlO2Rpc3BsYXk6aW5saW5lLWJsb2NrIj4NCjx0YWJsZSBkaXI9Imx0ciIgY2xhc3M9ImdtYWlsX3NpZ25hdHVyZSIgYWxpZ249ImxlZnQiIGNlbGxzcGFjaW5nPSIwIiBjZWxscGFkZGluZz0iMCIgc3R5bGU9ImxpbmUtaGVpZ2h0OjA7ZGlzcGxheTppbmxpbmUtdGFibGU7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlci1jb2xsYXBzZTpjb2xsYXBzZTtib3JkZXItc3BhY2luZzowcHgiPg0KPHRib2R5Pg0KPHRyPg0KPHRkIGRpcj0ibHRyIiBjbGFzcz0iZ21haWxfc2lnbmF0dXJlIiBzdHlsZT0ibGluZS1oZWlnaHQ6MDt2ZXJ0aWNhbC1hbGlnbjp0b3AiPg0KPHRhYmxlIGRpcj0ibHRyIiBjbGFzcz0iZ21haWxfc2lnbmF0dXJlIiBjZWxsc3BhY2luZz0iMCIgY2VsbHBhZGRpbmc9IjAiIHN0eWxlPSJsaW5lLWhlaWdodDowO3dpZHRoOjg2cHg7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlci1jb2xsYXBzZTpjb2xsYXBzZTtib3JkZXItc3BhY2luZzowcHgiPg0KPHRib2R5Pg0KPHRyPg0KPHRkIGRpcj0ibHRyIiBjbGFzcz0iZ21haWxfc2lnbmF0dXJlIiBzdHlsZT0ibGluZS1oZWlnaHQ6MDtwYWRkaW5nLXJpZ2h0OjE1cHg7dmVydGljYWwtYWxpZ246dG9wIj4NCjxzcGFuIHN0eWxlPSJmb250LWZhbWlseTpJbnRlcixBcmlhbCxzYW5zLXNlcmlmO2ZvbnQtc2l6ZTowcHg7Y29sb3I6cmdiKDAsMCwwKSI-PGEgaHJlZj0iaHR0cHM6Ly84ZmQwYjkxZi5zdHJlYWtsaW5rcy5jb20vQ2ZTeVhqM25KX3FIUDJzRmJRdzZINjJqL2h0dHBzJTNBJTJGJTJGd3d3Lm1ha2UuY29tJTJGIiB0YXJnZXQ9Il9ibGFuayI-PGltZyBzcmM9Imh0dHBzOi8vY2RuLm1ha2UuY29tL2hyL21ha2VfbG9nb19jbGVhci5wbmciIGhlaWdodD0iMjgiIHN0eWxlPSJoZWlnaHQ6IDI4cHg7IGRpc3BsYXk6IGJsb2NrOyI-PC9hPjwvc3Bhbj48L3RkPg0KPC90cj4NCjwvdGJvZHk-DQo8L3RhYmxlPg0KPC90ZD4NCjwvdHI-DQo8L3Rib2R5Pg0KPC90YWJsZT4NCjx0YWJsZSBkaXI9Imx0ciIgY2xhc3M9ImdtYWlsX3NpZ25hdHVyZSIgYWxpZ249ImxlZnQiIGNlbGxzcGFjaW5nPSIwIiBjZWxscGFkZGluZz0iMCIgc3R5bGU9ImxpbmUtaGVpZ2h0OjA7ZGlzcGxheTppbmxpbmUtdGFibGU7bWFyZ2luLXRvcDo3cHg7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlci1jb2xsYXBzZTpjb2xsYXBzZTtib3JkZXItc3BhY2luZzowcHgiPg0KPHRib2R5Pg0KPHRyPg0KPHRkIGRpcj0ibHRyIiBjbGFzcz0iZ21haWxfc2lnbmF0dXJlIiBzdHlsZT0ibGluZS1oZWlnaHQ6MDt2ZXJ0aWNhbC1hbGlnbjp0b3AiPg0KPHRhYmxlIGRpcj0ibHRyIiBjbGFzcz0iZ21haWxfc2lnbmF0dXJlIiBjZWxsc3BhY2luZz0iMCIgY2VsbHBhZGRpbmc9IjAiIHN0eWxlPSJsaW5lLWhlaWdodDowO21hcmdpbi10b3A6M3B4O3dpZHRoOjE0cHg7Ym94LXNpemluZzpib3JkZXItYm94O2JvcmRlci1jb2xsYXBzZTpjb2xsYXBzZTtib3JkZXItc3BhY2luZzowcHgiPg0KPHRib2R5Pg0KPHRyPg0KPHRkIGRpcj0ibHRyIiBjbGFzcz0iZ21haWxfc2lnbmF0dXJlIiBzdHlsZT0ibGluZS1oZWlnaHQ6MDtwYWRkaW5nLXJpZ2h0OjVweDtwYWRkaW5nLWxlZnQ6NXB4O3ZlcnRpY2FsLWFsaWduOnRvcDt3aWR0aDoxNHB4O2hlaWdodDoxMnB4Ij4NCjxzcGFuIHN0eWxlPSJmb250LWZhbWlseTpJbnRlcixBcmlhbCxzYW5zLXNlcmlmO2ZvbnQtc2l6ZTowcHg7Y29sb3I6cmdiKDAsMCwwKSI-PGEgaHJlZj0iaHR0cHM6Ly84ZmQwYjkxZi5zdHJlYWtsaW5rcy5jb20vQ2ZTeVhqM0p5UlAxdmczQzBRYURPUmpKL2h0dHBzJTNBJTJGJTJGdHdpdHRlci5jb20lMkZtYWtlX2hxIiB0YXJnZXQ9Il9ibGFuayI-PGltZyBzcmM9Imh0dHBzOi8vY2RuLm1ha2UuY29tL2ltZy9tYWtlL2ljby10d3QtYmxhY2sucG5nIiB3aWR0aD0iMTQiIGhlaWdodD0iMTIiIHN0eWxlPSJ3aWR0aDogMTRweDsgaGVpZ2h0OiAxMnB4OyBkaXNwbGF5OiBibG9jazsiPjwvYT48L3NwYW4-PC90ZD4NCjwvdHI-DQo8L3Rib2R5Pg0KPC90YWJsZT4NCjwvdGQ-DQo8L3RyPg0KPC90Ym9keT4NCjwvdGFibGU-DQo8dGFibGUgZGlyPSJsdHIiIGNsYXNzPSJnbWFpbF9zaWduYXR1cmUiIGFsaWduPSJsZWZ0IiBjZWxsc3BhY2luZz0iMCIgY2VsbHBhZGRpbmc9IjAiIHN0eWxlPSJsaW5lLWhlaWdodDowO2Rpc3BsYXk6aW5saW5lLXRhYmxlO21hcmdpbi10b3A6N3B4O2JveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7Ym9yZGVyLXNwYWNpbmc6MHB4Ij4NCjx0Ym9keT4NCjx0cj4NCjx0ZCBkaXI9Imx0ciIgY2xhc3M9ImdtYWlsX3NpZ25hdHVyZSIgc3R5bGU9ImxpbmUtaGVpZ2h0OjA7dmVydGljYWwtYWxpZ246dG9wIj4NCjx0YWJsZSBkaXI9Imx0ciIgY2xhc3M9ImdtYWlsX3NpZ25hdHVyZSIgY2VsbHNwYWNpbmc9IjAiIGNlbGxwYWRkaW5nPSIwIiBzdHlsZT0ibGluZS1oZWlnaHQ6MDttYXJnaW4tdG9wOjJweDt3aWR0aDoxNXB4O2JveC1zaXppbmc6Ym9yZGVyLWJveDtib3JkZXItY29sbGFwc2U6Y29sbGFwc2U7Ym9yZGVyLXNwYWNpbmc6MHB4Ij4NCjx0Ym9keT4NCjx0cj4NCjx0ZCBkaXI9Imx0ciIgY2xhc3M9ImdtYWlsX3NpZ25hdHVyZSIgc3R5bGU9ImxpbmUtaGVpZ2h0OjA7cGFkZGluZy1yaWdodDo1cHg7cGFkZGluZy1sZWZ0OjVweDt2ZXJ0aWNhbC1hbGlnbjp0b3A7d2lkdGg6MTVweDtoZWlnaHQ6MTVweCI-DQo8c3BhbiBzdHlsZT0iZm9udC1mYW1pbHk6SW50ZXIsQXJpYWwsc2Fucy1zZXJpZjtmb250LXNpemU6MHB4O2NvbG9yOnJnYigwLDAsMCkiPjxhIGhyZWY9Imh0dHBzOi8vOGZkMGI5MWYuc3RyZWFrbGlua3MuY29tL0NmU3lYajdyYTBnSGNSQUlQZ3VDUnBHLS9odHRwcyUzQSUyRiUyRmZhY2Vib29rLmNvbSUyRml0c01ha2VIUSIgdGFyZ2V0PSJfYmxhbmsiPjxpbWcgc3JjPSJodHRwczovL2Nkbi5tYWtlLmNvbS9pbWcvbWFrZS9pY28tZmNiLWJsYWNrLnBuZyIgd2lkdGg9IjE1IiBoZWlnaHQ9IjE1IiBzdHlsZT0id2lkdGg6IDE1cHg7IGhlaWdodDogMTVweDsgZGlzcGxheTogYmxvY2s7Ij48L2E-PC9zcGFuPjwvdGQ-DQo8L3RyPg0KPC90Ym9keT4NCjwvdGFibGU-DQo8L3RkPg0KPC90cj4NCjwvdGJvZHk-DQo8L3RhYmxlPg0KPHRhYmxlIGRpcj0ibHRyIiBjbGFzcz0iZ21haWxfc2lnbmF0dXJlIiBhbGlnbj0ibGVmdCIgY2VsbHNwYWNpbmc9IjAiIGNlbGxwYWRkaW5nPSIwIiBzdHlsZT0ibGluZS1oZWlnaHQ6MDtkaXNwbGF5OmlubGluZS10YWJsZTttYXJnaW4tdG9wOjdweDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlO2JvcmRlci1zcGFjaW5nOjBweCI-DQo8dGJvZHk-DQo8dHI-DQo8dGQgZGlyPSJsdHIiIGNsYXNzPSJnbWFpbF9zaWduYXR1cmUiIHN0eWxlPSJsaW5lLWhlaWdodDowO3ZlcnRpY2FsLWFsaWduOnRvcCI-DQo8dGFibGUgZGlyPSJsdHIiIGNsYXNzPSJnbWFpbF9zaWduYXR1cmUiIGNlbGxzcGFjaW5nPSIwIiBjZWxscGFkZGluZz0iMCIgc3R5bGU9ImxpbmUtaGVpZ2h0OjA7bWFyZ2luLXRvcDoycHg7d2lkdGg6MTRweDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlO2JvcmRlci1zcGFjaW5nOjBweCI-DQo8dGJvZHk-DQo8dHI-DQo8dGQgZGlyPSJsdHIiIGNsYXNzPSJnbWFpbF9zaWduYXR1cmUiIHN0eWxlPSJsaW5lLWhlaWdodDowO3BhZGRpbmctcmlnaHQ6NXB4O3BhZGRpbmctbGVmdDo1cHg7dmVydGljYWwtYWxpZ246dG9wO3dpZHRoOjE0cHg7aGVpZ2h0OjEzcHgiPg0KPHNwYW4gc3R5bGU9ImZvbnQtZmFtaWx5OkludGVyLEFyaWFsLHNhbnMtc2VyaWY7Zm9udC1zaXplOjBweDtjb2xvcjpyZ2IoMCwwLDApIj48YSBocmVmPSJodHRwczovLzhmZDBiOTFmLnN0cmVha2xpbmtzLmNvbS9DZlN5WGo3ZVhtYTNZRFlPNkFMOFcyNk8vaHR0cHMlM0ElMkYlMkZ3d3cubGlua2VkaW4uY29tJTJGY29tcGFueSUyRml0c21ha2VocSIgdGFyZ2V0PSJfYmxhbmsiPjxpbWcgc3JjPSJodHRwczovL2Nkbi5tYWtlLmNvbS9pbWcvbWFrZS9pY28tbG5rLWJsYWNrLnBuZyIgd2lkdGg9IjE0IiBoZWlnaHQ9IjEzIiBzdHlsZT0id2lkdGg6IDE0cHg7IGhlaWdodDogMTNweDsgZGlzcGxheTogYmxvY2s7Ij48L2E-PC9zcGFuPjwvdGQ-DQo8L3RyPg0KPC90Ym9keT4NCjwvdGFibGU-DQo8L3RkPg0KPC90cj4NCjwvdGJvZHk-DQo8L3RhYmxlPg0KPHRhYmxlIGRpcj0ibHRyIiBjbGFzcz0iZ21haWxfc2lnbmF0dXJlIiBhbGlnbj0ibGVmdCIgY2VsbHNwYWNpbmc9IjAiIGNlbGxwYWRkaW5nPSIwIiBzdHlsZT0ibGluZS1oZWlnaHQ6MDtkaXNwbGF5OmlubGluZS10YWJsZTttYXJnaW4tdG9wOjdweDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlO2JvcmRlci1zcGFjaW5nOjBweCI-DQo8dGJvZHk-DQo8dHI-DQo8dGQgZGlyPSJsdHIiIGNsYXNzPSJnbWFpbF9zaWduYXR1cmUiIHN0eWxlPSJsaW5lLWhlaWdodDowO3ZlcnRpY2FsLWFsaWduOnRvcCI-DQo8dGFibGUgZGlyPSJsdHIiIGNsYXNzPSJnbWFpbF9zaWduYXR1cmUiIGNlbGxzcGFjaW5nPSIwIiBjZWxscGFkZGluZz0iMCIgc3R5bGU9ImxpbmUtaGVpZ2h0OjA7bWFyZ2luLXRvcDoycHg7d2lkdGg6MTVweDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlO2JvcmRlci1zcGFjaW5nOjBweCI-DQo8dGJvZHk-DQo8dHI-DQo8dGQgZGlyPSJsdHIiIGNsYXNzPSJnbWFpbF9zaWduYXR1cmUiIHN0eWxlPSJsaW5lLWhlaWdodDowO3BhZGRpbmctcmlnaHQ6NXB4O3BhZGRpbmctbGVmdDo1cHg7dmVydGljYWwtYWxpZ246dG9wO3dpZHRoOjE1cHg7aGVpZ2h0OjE1cHgiPg0KPHNwYW4gc3R5bGU9ImZvbnQtZmFtaWx5OkludGVyLEFyaWFsLHNhbnMtc2VyaWY7Zm9udC1zaXplOjBweDtjb2xvcjpyZ2IoMCwwLDApIj48YSBocmVmPSJodHRwczovLzhmZDBiOTFmLnN0cmVha2xpbmtzLmNvbS9DZlN5WGo3SEJ6aVRmZ3hyZGdjTG9hQVAvaHR0cHMlM0ElMkYlMkZ3d3cuaW5zdGFncmFtLmNvbSUyRml0c21ha2VocSUyRiIgdGFyZ2V0PSJfYmxhbmsiPjxpbWcgc3JjPSJodHRwczovL2Nkbi5tYWtlLmNvbS9pbWcvbWFrZS9pY28taW5zLWJsYWNrLnBuZyIgd2lkdGg9IjE1IiBoZWlnaHQ9IjE1IiBzdHlsZT0id2lkdGg6IDE1cHg7IGhlaWdodDogMTVweDsgZGlzcGxheTogYmxvY2s7Ij48L2E-PC9zcGFuPjwvdGQ-DQo8L3RyPg0KPC90Ym9keT4NCjwvdGFibGU-DQo8L3RkPg0KPC90cj4NCjwvdGJvZHk-DQo8L3RhYmxlPg0KPHRhYmxlIGRpcj0ibHRyIiBjbGFzcz0iZ21haWxfc2lnbmF0dXJlIiBhbGlnbj0ibGVmdCIgY2VsbHNwYWNpbmc9IjAiIGNlbGxwYWRkaW5nPSIwIiBzdHlsZT0ibGluZS1oZWlnaHQ6MDtkaXNwbGF5OmlubGluZS10YWJsZTttYXJnaW4tdG9wOjdweDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlO2JvcmRlci1zcGFjaW5nOjBweCI-DQo8dGJvZHk-DQo8dHI-DQo8dGQgZGlyPSJsdHIiIGNsYXNzPSJnbWFpbF9zaWduYXR1cmUiIHN0eWxlPSJsaW5lLWhlaWdodDowO3ZlcnRpY2FsLWFsaWduOnRvcCI-DQo8dGFibGUgZGlyPSJsdHIiIGNsYXNzPSJnbWFpbF9zaWduYXR1cmUiIGNlbGxzcGFjaW5nPSIwIiBjZWxscGFkZGluZz0iMCIgc3R5bGU9ImxpbmUtaGVpZ2h0OjA7bWFyZ2luLXRvcDo0cHg7d2lkdGg6MTRweDtib3gtc2l6aW5nOmJvcmRlci1ib3g7Ym9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlO2JvcmRlci1zcGFjaW5nOjBweCI-DQo8dGJvZHk-DQo8dHI-DQo8dGQgZGlyPSJsdHIiIGNsYXNzPSJnbWFpbF9zaWduYXR1cmUiIHN0eWxlPSJsaW5lLWhlaWdodDowO3BhZGRpbmctcmlnaHQ6NXB4O3BhZGRpbmctbGVmdDo1cHg7dmVydGljYWwtYWxpZ246dG9wO3dpZHRoOjE0cHg7aGVpZ2h0OjEwcHgiPg0KPHNwYW4gc3R5bGU9ImZvbnQtZmFtaWx5OkludGVyLEFyaWFsLHNhbnMtc2VyaWY7Zm9udC1zaXplOjBweDtjb2xvcjpyZ2IoMCwwLDApIj48YSBocmVmPSJodHRwczovLzhmZDBiOTFmLnN0cmVha2xpbmtzLmNvbS9DZlN5WGpfMWRiaHRtaW5XWlFDTmF4NlYvaHR0cHMlM0ElMkYlMkZ3d3cueW91dHViZS5jb20lMkZjaGFubmVsJTJGVUM4S1dScmY4d3F5b3dtV2hYSjlEUmpRIiB0YXJnZXQ9Il9ibGFuayI-PGltZyBzcmM9Imh0dHBzOi8vY2RuLm1ha2UuY29tL2ltZy9tYWtlL2ljby15dGItYmxhY2sucG5nIiB3aWR0aD0iMTQiIGhlaWdodD0iMTAiIHN0eWxlPSJ3aWR0aDogMTRweDsgaGVpZ2h0OiAxMHB4OyBkaXNwbGF5OiBibG9jazsiPjwvYT48L3NwYW4-PC90ZD4NCjwvdHI-DQo8L3Rib2R5Pg0KPC90YWJsZT4NCjwvdGQ-DQo8L3RyPg0KPC90Ym9keT4NCjwvdGFibGU-DQo8L2Rpdj4NCjwvdGQ-DQo8L3RyPg0KPC90Ym9keT4NCjwvdGFibGU-DQo8ZGl2IGNsYXNzPSJnbWFpbF9xdW90ZSIgc3R5bGU9Im1heC1oZWlnaHQ6MXB4Ij48aW1nIHNyYz0iaHR0cHM6Ly9tYWlsZm9vZ2FlLmFwcHNwb3QuY29tL3Q_c2VuZGVyPWFZeTVqYUdWdVowQnRZV3RsTG1OdmJRJTNEJTNEJmFtcDt0eXBlPXplcm9jb250ZW50JmFtcDtndWlkPTk1OGZhOGZlLWQ4NmUtNDAzOS04NWJkLTU2ZmNlNWNhNzY5MCIgc3R5bGU9IndpZHRoOiAwcHg7IG1heC1oZWlnaHQ6IDBweDsiPjxzcGFuIHN0eWxlPSJmb250LXNpemU6MTBweDtjb2xvcjpyZ2IoMjU1LDI1NSwyNTUpIj7hkKc8L3NwYW4-PC9kaXY-DQo8L2Jsb2NrcXVvdGU-DQo8L2Rpdj4NCjwvZGl2Pg0KDQo8L2Jsb2NrcXVvdGU-PC9kaXY-DQo="
                                }
                            }
                        ]
                    },
                    {
                        "partId": "1",
                        "mimeType": "image/jpeg",
                        "filename": "image109199.jpg",
                        "headers": {
                            "Content-Type": "image/jpeg; name=\"image109199.jpg\"",
                            "Content-Disposition": "inline; filename=\"image109199.jpg\"",
                            "Content-Transfer-Encoding": "base64",
                            "Content-ID": "<ii_197d662d7de715cbbe51>",
                            "X-Attachment-Id": "ii_197d662d7de715cbbe51"
                        },
                        "body": {
                            "attachmentId": "ANGjdJ85vb---dJ0_l0SQEPKWAb3NLPjHdJB_SfRvAc84jlmqlvG-FkzE7vnw0yZ8BUb0wR7WTRa8Bq131UThfXkccWQzen-_MaHkbzq5WSYmgGHd-PUz7fjF1IS9u192sGVznWStM9Y_J9luqZBaEXYt-tCnGmTziXGbILDJsOu16XjSrufOMl1iTqdkHojrF75Ov4FPPP0-kT7rj8tCU3oNjwL-Xy1mdQbH4X7T70L7RdfI5ssPBBU9u_PnTuI6iV_W5k-Y_vGYrF-m7RX3t-fP2V8QtrBB3-sD7WgjJN-cvoXpb6L75u_NbJChx7Hi2VdcHy9NOSNvede9SAPdm1C0fI1R5QTEj223W49dYbYt_lkXilxsdMGI7f-kYYPJBrJ5Kv78hVmjfN8MYOx",
                            "size": 91845
                        }
                    }
                ]
            },
            "sizeEstimate": 158564,
            "historyId": "1534941",
            "internalDate": "2025-07-04T17:05:08.000Z",
            "eventType": "messageLabelRemoved",
            "removedLabels": [
                "UNREAD"
            ],
            "__IMTINDEX__": 1,
            "__IMTLENGTH__": 1
        }
];

// To test, you would call the function like this:
const result = processGmailPayload(gmailPayload);
console.log(result);