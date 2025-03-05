function emailLog() {
    var tbu = DriveApp.getFolderById('1LdlFA_L8_i4Q-v9q0ja2lsu_dfNtcGbe');
    var emails = GmailApp.search('is:unread label:uploads');
    var sheet = SpreadsheetApp.openById('17vCpedF3JLbLktr_cdmrv_U116GdTPvwqlCN6o7Nfgg').getActiveSheet();
    var nextRow = sheet.getLastRow() + 1;
    var data = [];
  
    if (emails.length === 0) return;
  
    emails.forEach(emailThread => {
      var email = emailThread.getMessages()[0]; 
      if (!email.isUnread()) return;
  
      var body = email.getPlainBody();
      var subj = email.getSubject();
      var sender = email.getFrom();
      var receiver = email.getTo();
      var recd = email.getDate();
      
      var fileDate = new Date();
      var source = null, des = null, amt = null, ct = null, freq = null, fy = null;
      var status = null, subtype = '', url = null, note = null;
  
      if (sender.includes('engageusa')) {
        ({ source, des, freq, amt, ct, fileDate, url } = processEngageEmail(body, subj));
      } else if (sender.includes('paymentsolutions')) {
        ({ source, des, freq, amt, ct, fileDate, subtype, status, url } = processPSIEmail(email, body, subj, sheet, tbu, recd));
      } else if (receiver.includes('+shopify')) {
        ({ source, des, freq, fileDate } = processShopifyEmail(body, recd, sheet));
      }
  
      if (!source) return;
  
      fy = fileDate.getFullYear();
      if (fileDate.getMonth() > 8) fy++;
  
      var fileName = `${source} ${des} ${formatDate(fileDate)}${subtype}`;
      url = url ? `=HYPERLINK("${url}", "File")` : null;
      
      email.markRead();
  
      data.push([recd, fileName, des, amt, ct, freq, fy, note, status, url]);
    });
  
    if (data.length > 0) {
      sheet.getRange(nextRow, 1, data.length, 10).setValues(data);
    }
  }
  
  function processEngageEmail(body, subj) {
    var source = 'Engage';
    var des = subj.includes('PAC') ? 'PAC' : 'c4';
    var freq = subj.includes('PAC') ? 'Weekly' : 'Daily';
  
    var totLine = body.indexOf('Total Donors');
    var totStart = body.indexOf('$', totLine);
    var totEnd = body.indexOf('\r', totLine);
    var amt = body.substring(totStart, totEnd);
    
    var totCt = parseInt(body.substring(totLine + 12, totStart - 2));
    var nonCt = parseInt(body.substring(totLine - 12, totLine - 4).trim());
    var ct = totCt + nonCt;
  
    var dateMatch = body.match(/The (?:file|data) for (\d{1,2}\/\d{1,2}\/\d{4})/);
    var fileDate = dateMatch ? new Date(dateMatch[1]) : new Date();
  
    var url = getEngageFile(fileDate, 'c4');
  
    return { source, des, freq, amt, ct, fileDate, url };
  }
  
  function processPSIEmail(email, body, subj, sheet, tbu, recd) {
    var source = 'PSI';
    var des = 'c4';
    var freq = subj.includes('Daily Reports') ? 'Daily' : 'Monthly';
    var subtype = '', amt = 0, ct = 0, url = null, status = 'Awaiting Upload File';
  
    if (subj.includes('Daily Reports')) {
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
  
  function processPSICreditFile(email, sheet, tbu) {
    var files = email.getAttachments();
    if (!files.length) return null;
  
    var csvData = files.map(file => Utilities.parseCsv(file.getDataAsString())).flat();
    var newSS = SpreadsheetApp.create('PSI c4 One-Time');
    DriveApp.getFileById(newSS.getId()).moveTo(tbu);
    newSS.getActiveSheet().getRange(1, 1, csvData.length, csvData[0].length).setValues(csvData);
  
    return newSS.getUrl();
  }
  
  function processPSIPaymentFile(email, body, tbu) {
    var fileName = body.match(/File Name:\s+(\d{6})/);
    var dateStr = fileName ? '20' + fileName[1].replace(/(.{2})/g, "$1.") : null;
    if (!dateStr) return null;
  
    var fileDate = new Date(dateStr);
    var newSS = SpreadsheetApp.create('PSI c4 ' + formatDate(fileDate));
    DriveApp.getFileById(newSS.getId()).moveTo(tbu);
  
    return newSS.getUrl();
  }
  
  function processShopifyEmail(body, recd, sheet) {
    return { source: 'Shopify', des: 'c4', freq: 'Monthly', fileDate: new Date(recd.getFullYear(), recd.getMonth() + 1, 0) };
  }
  
  function formatDate(date) {
    return ('0' + (date.getMonth() + 1)).slice(-2) + '.' + ('0' + date.getDate()).slice(-2);
  }
  