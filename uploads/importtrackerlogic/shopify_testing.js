function shopifyTest() {
    // Access folder in Google Drive 
    var tbu = DriveApp.getFolderById('13Kmk6QNhGt6ZbnKytWY_RjwbRNaBuTdZ');
    // Retrieve unread emails with 'uploads' label
    var emails = GmailApp.search('is:unread label:uploads');
    // Access the Google Sheet 
    var sheet = SpreadsheetApp.openById('17vCpedF3JLbLktr_cdmrv_U116GdTPvwqlCN6o7Nfgg').getActiveSheet();
    // Determine the next available row in the sheet
    var nextRow = sheet.getLastRow() + 1;
    var data = [];
  
    // Get previously stored names and URLs in the sheet
    var oldNews = {
      names: sheet.getRange(2, 2, sheet.getLastRow()).getValues().toString().split(','),
      urls: sheet.getRange(2, 10, sheet.getLastRow()).getRichTextValues().map(value => value[0].getLinkUrl())
    };
  
    // Kill if no unread emails are found
    if (emails.length == 0) {
      return;
    }
  
    var k = 0;
  
    // Loop through unread emails
    for (var i = 0; i < emails.length; i++) {
      var email = emails[i].getMessages()[k];  // Get the current email message
      var body = email.getPlainBody();  // Get email body text
      var subj = email.getSubject();  // Get email subject
      var sender = email.getFrom();  // Get sender's email address
      var receiver = email.getTo();  // Get recipient's email address
  
      // Get variables for file extraction
      var recd = email.getDate();  // Get the email's received date
      var fileDate = new Date();  // Set initial file date
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
  
      /////////////////////////////////////// Shopify Email Parsing ////////////////////////////////////////////////
  
      // Check if the email is related to Shopify
      if (receiver.includes('+shopify')) {
        source = 'Shopify';  // Set source as Shopify
        des = 'c4';  // Set description
        freq = 'Monthly';  // Set frequency
  
        // Check if there are multiple emails in the thread and move to the next one if necessary
        if (emails[i].getMessages().length > k + 1) {
          k++;
          i--;
        } else {
          k = 0;
        }
  
        // Extract data from email body
        var hold = body.substring(body.indexOf('{'), body.indexOf('}'));
        body = body.replace(hold, 'HOLD');
        body = body.replace(/( USD)|( \d{2}:\d{2}:\d{2} \-\d{4})/, '');  // Clean up body
  
        // Split body into key-value pairs
        var info = body.split(/[:\r\n]+/).map(value => value.trim());
  
        // Extract relevant data
        var infoi = info.indexOf('Lineitem Name') + 1;
        var bodyi = body.indexOf('Lineitem Name') + 18;
        info.length = infoi;
        info.push(body.slice(bodyi).replace(/\n\r/, ''));
  
        // Ensure phone number is included in the data
        var phonerow = info.indexOf('Note Attributes') - 1;
        if (!info[phonerow].match(/\d/)) {
          info.splice(phonerow + 1, 0, '');
        }
  
        // Define headers 
        var headers = ['Order Number', 'Email', 'Financial Status', 'Paid at', 'Fulfillment Status', 'Fulfilled at', 'Accepts Marketing', 'Currency', 'Subtotal', 'Shipping', 'Taxes', 'Total', 'Discount Code', 'Discount Amount', 'Shipping Method', 'Created at', 'Lineitem quantity', 'Lineitem Name', 'Lineitem price', 'Lineitem compare at price', 'Lineitem sku', 'Lineitem requires shipping', 'Lineitem taxable', 'Lineitem fulfillment status', 'Billing Name', 'Billing Street', 'Billing Address1', 'Billing Address2', 'Billing Company', 'Billing City', 'Billing Zip', 'Billing Province', 'Billing Country', 'Billing Phone', 'Shipping Name', 'Shipping Street', 'Shipping Address1', 'Shipping Address2', 'Shipping Company', 'Shipping City', 'Shipping Zip', 'Shipping Province', 'Shipping Country', 'Shipping Phone', 'Notes', 'Note Attributes'];
  
        var importData = [];
  
        // Loop through headers and extract corresponding data from email
        for (var j = 0; j < headers.length; j++) 
  
//emails.length check can just be done once at the top of the script
//email credentials should not be hardcoded and should be handled via the PropertiesService
//perhaps breaking down the larger functions into more modular ones
