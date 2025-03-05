function shopifyTest() {
    // Get folder by ID where the files will be stored
    var tbu = DriveApp.getFolderById('13Kmk6QNhGt6ZbnKytWY_RjwbRNaBuTdZ');
    
    // Retrieve unread emails with the "uploads" label
    var emails = GmailApp.search('is:unread label:uploads');
    
    // Open the target Google Sheet and find the next available row
    var sheet = SpreadsheetApp.openById('17vCpedF3JLbLktr_cdmrv_U116GdTPvwqlCN6o7Nfgg').getActiveSheet();
    var nextRow = sheet.getLastRow() + 1;
    var data = [];  // Array to hold data to be inserted into the sheet
  
    // Retrieve previously processed file names and URLs for reference
    var oldNews = {
      names: sheet.getRange(2, 2, sheet.getLastRow()).getValues().toString().split(','),
      urls: sheet.getRange(2, 10, sheet.getLastRow()).getRichTextValues().map(value => value[0].getLinkUrl())
    };
  
    // kill function
    if (emails.length == 0) {
      return;
    }
  
    // Variable to track the current email message being processed
    var k = 0;
  
    // Loop through each email in the list
    for (var i = 0; i < emails.length; i++) {
      var email = emails[i].getMessages()[k]; // Get the current message
      var body = email.getPlainBody(); // Get the email body
      var subj = email.getSubject(); // Get the email subject
      var sender = email.getFrom(); // Get the sender of the email
      var receiver = email.getTo(); // Get the receiver of the email
  
      // Store email's received date and initialize other variables
      var recd = email.getDate();
      var fileDate = new Date();
      var source = null;
      var fileName = null;
      var des = null;
      var amt = null;
      var ct = null;
      var freq = null;
      var fy = null;
      var note = null;
      var status = null;
      var subtype = '';
      var url = null;
  
      // Check if the email is related to Shopify (using specific receiver email format)
      if (receiver.includes('+shopify')) {
        source = 'Shopify'; // Set source as Shopify
        des = 'c4'; // Set description for the file
        freq = 'Monthly'; // Set frequency to monthly
  
        // Check for additional messages in the thread
        if (emails[i].getMessages().length > k + 1) {
          k++;
          i--;
        } else {
          k = 0;  // Reset k for the next email
        }
  
        // Extract data from the email body
        var hold = body.substring(body.indexOf('{'), body.indexOf('}')); // Hold data within curly braces
        body = body.replace(hold, 'HOLD'); // Replace curly braces with a placeholder
        body = body.replace(/( USD)|( \d{2}:\d{2}:\d{2} \-\d{4})/, ''); // Clean up USD and time format
  
        // Split the body into an array of trimmed values based on line breaks and colons
        var info = body.split(/[:\r\n]+/).map(value => value.trim());
  
        // Find the starting position of the product information
        var infoi = info.indexOf('Lineitem Name') + 1;
        var bodyi = body.indexOf('Lineitem Name') + 18;
        info.length = infoi;
        info.push(body.slice(bodyi).replace(/\n\r/, ''));
  
        // If phone number is missing, add an empty string for phone
        var phonerow = info.indexOf('Note Attributes') - 1;
        if (!info[phonerow].match(/\d/)) {
          info.splice(phonerow + 1, 0, '');
        }
  
        // Header fields for the Shopify data
        var headers = ['Order Number', 'Email', 'Financial Status', 'Paid at', 'Fulfillment Status', 'Fulfilled at', 'Accepts Marketing', 'Currency', 'Subtotal', 'Shipping', 'Taxes', 'Total', 'Discount Code', 'Discount Amount', 'Shipping Method', 'Created at', 'Lineitem quantity', 'Lineitem Name', 'Lineitem price', 'Lineitem compare at price', 'Lineitem sku', 'Lineitem requires shipping', 'Lineitem taxable', 'Lineitem fulfillment status', 'Billing Name', 'Billing Street', 'Billing Address1', 'Billing Address2', 'Billing Company', 'Billing City', 'Billing Zip', 'Billing Province', 'Billing Country', 'Billing Phone', 'Shipping Name', 'Shipping Street', 'Shipping Address1', 'Shipping Address2', 'Shipping Company', 'Shipping City', 'Shipping Zip', 'Shipping Province', 'Shipping Country', 'Shipping Phone', 'Notes', 'Note Attributes'];
  
        var importData = []; // Array to store extracted data
  
        // Extract each data field based on the header
        for (var j = 0; j < headers.length; j++) {
          var name = headers[j];
          var index = info.indexOf(name);
          if (index !== -1) {
            importData.push(info[index + 1].trim().replace('HOLD', hold));
          } else if (name == 'Billing Name') {
            index = info.indexOf('Billing');
            var bName = info[index + 1].trim();
            var bStreet = info[index + 2];
            var bStreet2 = '';
            if (info[index + 7].includes('Note Attributes')) {
              bStreet2 = info[index + 3];
              index++;
            }
            var bCity = info[index + 3].slice(0, info[index + 3].lastIndexOf(' ')-3);
            var bState = info[index + 3].slice(info[index + 3].lastIndexOf(' ')-3, info[index + 3].lastIndexOf(' '));
            var bZip = info[index + 3].match(/\d{5}/)[0];
            var bCountry = info[index + 4];
            var bPhone = info[index + 5];
            importData.push(
              bName,
              bStreet,
              bStreet2, 
              '', '',
              bCity,
              bState,
              bZip,
              bCountry,
              bPhone
            );
            j += 9; // Skip over billing address data
          } else {
            importData.push('');
          }
        }
  
        // Check if the data for this month already exists in the old news array
        var mo = recd.getMonth() + 1;
        fileDate = new Date(recd.getFullYear(), mo, 0);
        var name = 'Shopify c4 ' + mo.toPrecision(2) + '.' + fileDate.getDate().toPrecision(2);
  
        // If new, create a new sheet; otherwise, append to the existing sheet
        var shopRow = oldNews.names.indexOf(name);
        var shopSheet;
        if (shopRow == -1) {
          var shopss = SpreadsheetApp.create(name);
          DriveApp.getFileById(shopss.getId()).moveTo(tbu);
          shopSheet = shopss.getActiveSheet();
          shopSheet.setFrozenRows(1);
          shopSheet.appendRow(headers);
          shopSheet.appendRow(importData);
          url = shopss.getUrl();
          oldNews.names.push(name);
          oldNews.urls.push(url);
          console.log(url);
        } else {
          var shopurl = oldNews.urls[shopRow];
          shopSheet = SpreadsheetApp.openByUrl(shopurl).getActiveSheet();
          shopSheet.appendRow(importData);
          continue;
        }
  
        console.log(name);
  
      } else {
        continue; // Skip email if it doesn't relate to Shopify
      }
  
      // Process the fiscal year and format the file date for naming
      fy = fileDate.getFullYear();
      if (fileDate.getMonth() > 8) {
        fy++;
      }
      fileDate = ('0' + (fileDate.getMonth() + 1)).slice(-2) + '.' + ('0' + fileDate.getDate()).slice(-2);
  
      fileName = source + ' ' + des + ' ' + fileDate + subtype;
      
      // Handle case where no source is identified in the email
      if (source == null) {
        var sourceStart = sender.indexOf('@') + 1;
        source = sender.substring(sourceStart);
        var eid = emails[i].getId();
        var eurl = 'https://mail.google.com/mail/u/0/#inbox/' + eid;
        fileName = 'Awaiting Manual Fill: file from ' + source;
        url = '=HYPERLINK("' + eurl + '", "Email")';
      } else {
        console.log(fileName);
        // email.markRead();
        if (url !== null) {
          url = '=HYPERLINK("' + url + '", "File")';
        }
      }
      
      // Create the row of data to be inserted into the Google Sheet
      var row = [recd, fileName, des, amt, ct, freq, fy, note, status, url];
      data.push(row);
    }
  
    // If no data was processed, exit function
    if (data.length == 0) {
      return;
    }
  
    console.log(data);
  
    // Insert the data into the next available row in the target sheet
    var range = sheet.getRange(nextRow, 1, data.length, 10);
    range.setValues(data);
  }

///info.indexOf calls for extracting data are repeated multiple times, can make into a helper function for maintainence
///logic for handling Shopify data (e.g., extracting billing address and shipping information) should be split into its own function
