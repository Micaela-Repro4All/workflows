function emailLog() {
    var tbu = DriveApp.getFolderById('1LdlFA_L8_i4Q-v9q0ja2lsu_dfNtcGbe'); // Folder for storing processed files
    var emails = GmailApp.search('is:unread label:uploads'); // Retrieve unread emails with 'uploads' label
    var sheet = SpreadsheetApp.openById('17vCpedF3JLbLktr_cdmrv_U116GdTPvwqlCN6o7Nfgg').getActiveSheet();
    var nextRow = sheet.getLastRow() + 1; // Determine the next available row in the spreadsheet
    var data = []; // Array to store email processing results
  
    if (emails.length === 0) return; // Exit if no unread emails
  
    emails.forEach(emailThread => {
      var email = emailThread.getMessages()[0]; // Get the first message in the thread
      if (!email.isUnread()) return; // Skip already read emails
  
      var body = email.getPlainBody();
      var subj = email.getSubject();
      var sender = email.getFrom();
      var receiver = email.getTo();
      var recd = email.getDate();
      
      var fileDate = new Date(); // Default file date to current date
      var source = null, des = null, amt = null, ct = null, freq = null, fy = null;
      var status = null, subtype = '', url = null, note = null;
  
      // Identify email source and process accordingly
      if (sender.includes('engageusa')) {
        ({ source, des, freq, amt, ct, fileDate, url } = processEngageEmail(body, subj));
      } else if (sender.includes('paymentsolutions')) {
        ({ source, des, freq, amt, ct, fileDate, subtype, status, url } = processPSIEmail(email, body, subj, sheet, tbu, recd));
      } else if (receiver.includes('+shopify')) {
        ({ source, des, freq, fileDate } = processShopifyEmail(body, recd, sheet));
      }
  
      if (!source) return; // Skip if source not identified
  
      fy = fileDate.getFullYear(); // Determine fiscal year
      if (fileDate.getMonth() > 8) fy++;
  
      var fileName = `${source} ${des} ${formatDate(fileDate)}${subtype}`; // Construct file name
      url = url ? `=HYPERLINK("${url}", "File")` : null; // Format URL as hyperlink
      
      email.markRead(); // Mark email as read after processing
  
      data.push([recd, fileName, des, amt, ct, freq, fy, note, status, url]); // Store processed data
    });
  
    if (data.length > 0) {
      sheet.getRange(nextRow, 1, data.length, 10).setValues(data); // Batch write to spreadsheet
    }
  }
  
  // Process Engage emails
  function processEngageEmail(body, subj) {
    var source = 'Engage';
    var des = subj.includes('PAC') ? 'PAC' : 'c4';
    var freq = subj.includes('PAC') ? 'Weekly' : 'Daily';
  
    // Extract donation amounts and donor counts
    var totLine = body.indexOf('Total Donors');
    var totStart = body.indexOf('$', totLine);
    var totEnd = body.indexOf('\r', totLine);
    var amt = body.substring(totStart, totEnd);
    
    var totCt = parseInt(body.substring(totLine + 12, totStart - 2));
    var nonCt = parseInt(body.substring(totLine - 12, totLine - 4).trim());
    var ct = totCt + nonCt;
  
    // Extract file date
    var dateMatch = body.match(/The (?:file|data) for (\d{1,2}\/\d{1,2}\/\d{4})/);
    var fileDate = dateMatch ? new Date(dateMatch[1]) : new Date();
  
    var url = getEngageFile(fileDate, 'c4'); // Generate file link
  
    return { source, des, freq, amt, ct, fileDate, url };
  }
  
  // Process PSI emails
  function processPSIEmail(email, body, subj, sheet, tbu, recd) {
    var source = 'PSI';
    var des = 'c4';
    var freq = subj.includes('Daily Reports') ? 'Daily' : 'Monthly';
    var subtype = '', amt = 0, ct = 0, url = null, status = 'Awaiting Upload File';
  
    if (subj.includes('Daily Reports')) {
      // Extract donation amounts and donor counts from body
      let matches = [...body.matchAll(/(\d{2}\/\d{2}\/\d{4})\s+\d+\s+(\d+)\s+([\d,.]+)/g)];
      matches.forEach(match => {
        ct += parseInt(match[2]);
        amt += parseFloat(match[3].replace(',', ''));
      });
    } else if (subj.includes('Credit Card Payment File')) {
      url = processPSICreditFile(email, sheet, tbu);
      subtype = ' One-Time';
    } else if (subj.includes('Payment Upload File')) {
      subtype = subj.includes('First') ? ' First Month' : ' Monthly';
      url = processPSIPaymentFile(email, body, tbu);
    }
  
    return { source, des, freq, amt, ct, fileDate: new Date(), subtype, status, url };
  }
  
  // Format date as MM.DD
  function formatDate(date) {
    return ('0' + (date.getMonth() + 1)).slice(-2) + '.' + ('0' + date.getDate()).slice(-2);
  }  