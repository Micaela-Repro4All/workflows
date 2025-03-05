function testmatch() {
    // Get today's date formatted as MMDDYYYY
    var today = Utilities.formatDate(new Date(),  "GMT-5", "MM.dd.yyyy");
    console.log(today.sp);  // This line has an error because `today` is a string, and `sp` does not exist.
  }
  
  /*  
    Sample code to fetch data from an FTP site, previously commented out.
  */
  /*
  var response = UrlFetchApp.fetch('https://engageusa-ftp.com/');
  
    var loginUrl = 'https://engageusa-ftp.com/WebInterface/login.html';  // Replace with actual login URL
    var fileListUrl = 'https://engageusa-ftp.com/#/Engage%20to%20PC/'; // URL where file links are listed
    var username = 'sbrock@reproductivefreedomforall.org';
    var password = 'b93C6y';
  */
  
  // Function to initiate the Cauze file process
  function getCauzeFile() {
    // Get login token from login function
    var token = loginToCauze(); // Get the token from the login function
    console.log(token);  // Log the token for debugging
    // Fetch the data using the token
    var data = getCauzeData(token);
    // Create a Google Sheet and retrieve URL
    var url = createCauzeSS(data);
  
    // Set the URL in a specific cell of the "Urls" sheet
    var ss = SpreadsheetApp.getActive();
    var sheet = ss.getSheetByName('Urls');
    sheet.getRange( 7, 2).setValue(url);  // Set the URL in cell B7
  }
  
  // Function to login to Cauze and get session token
  function loginToCauze() {
    var url = 'https://engageusa-ftp.com/WebInterface/function/';  // GraphQL endpoint for login
  
    // Define payload with login credentials and random parameter
    const payload = {
      'command': 'login',
      'username': 'sbrock@reproductivefreedomforall.org', // Replace with your email
      'password': 'b93C6y',  // Replace with your password
      'encoded': 'true',
      'language': 'en',
      'random': Math.random().toString() // random parameter
    };
  
    // Define request options with method and headers
    var options = {
      'method': 'post',
      'payload': payload,
      'headers': {
        'Accept': 'text/javascript, text/html, application/xml, text/xml, */*',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://engageusa-ftp.com/WebInterface/login.html',
        'Origin': 'https://engageusa-ftp.com'
      },
      'muteHttpExceptions': true, // Continue even if an error occurs
      'followRedirects': true // Follow any redirects automatically
    };
  
    // Make the POST request to the login URL
    var response = UrlFetchApp.fetch(url, options);
  
    // Extract cookies from the response headers (session management)
    var cookies = response.getHeaders()['Set-Cookie'];
    console.log('Session Cookies: ' + cookies);  // Log cookies for debugging
  
    return cookies;  // Return cookies for future requests
  }
  
  // Function to fetch data from Cauze API using the login token
  function getCauzeData(token) {
    var url = "https://api2.cauze.com/graphql"; // New GraphQL endpoint for Cauze API
  
    console.log(url);  // Log URL for debugging
  
    // Payload structure for the GraphQL query to fetch charity ledger data
    var payload = {
      operationName: "charityLedger",
      variables: {
        "offset": 0,
        "limit": 100,
        "sort": "donation_date",
        "sort_direction": "desc"
      },
      query: `query charityLedger($limit: Int, $offset: Int, $sort: String, $sort_direction: String) {
        outstandingThanksPurchases {
          id
          __typename
        }
        charityLedger(
          limit: $limit
          offset: $offset
          sort: $sort
          sortDirection: $sort_direction
        ) {
          netAmount
          items {
            sponsorName
            donationDate
            donationAmount
            processedDate
            purchaseId
            netAmount
            eventId
            matchAmount
            granted
            grantType
            giftId
            comment
            charityCommented
            email
            actorName
            __typename
          }
          __typename
        }
      }`
    };
  
    // Options for the API request including the token for authentication
    const options = {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`, // Use the token for authentication
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/csv",
        "Content-Type": "application/json",
        "Referer": "https://web.cauze.com/",
        "Origin": "https://web.cauze.com/",
        "x-acting-as": "CHARITY",
        "x-acting-as-id": "460333"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true  // Allow logging of errors if any
    };
  
    // Send the POST request and parse the response
    var response = UrlFetchApp.fetch(url, options);
    var fullresponse = JSON.parse(response.getContentText());
    var data = fullresponse.data.charityLedger.items;
  
    console.log(data);  // Log the data for debugging
  
    return data;  // Return the fetched data
  }
  
  // Function to create a Google Sheet with Cauze data
  function createCauzeSS(predata) {
    // Define headers for the Google Sheet
    var headers = ['Full Name', 'Email', 'Gift Date', 'Gift Amount', 'Match Amount', 'Fee', 'Net Amount', 'Deposit Date', 'Comment', 'Matched By'];
    var data = [headers];  // Initialize data array with headers
  
    // Filter only "granted" items in the predata
    predata = predata.filter(item => item.granted);
  
    // Loop through each item in the filtered predata
    for (var i = 0; i < predata.length; i++) {
      var item = predata[i];
      var giftAmt = item.donationAmount - item.matchAmount;  // Calculate gift amount
      var feeAmt = item.donationAmount - item.netAmount;  // Calculate fee amount
  
      // Create a row for each item with the necessary details
      var row = [
        item.actorName.replace(/(An Anonymous User)|(Giver)/, 'Anonymous'), // Replace anonymous user or giver with "Anonymous"
        item.email.replace('<private>', ''),  // Clean email if it contains "<private>"
        item.donationDate,  // Gift date
        giftAmt / 100,  // Convert gift amount to dollars
        item.matchAmount / 100,  // Convert match amount to dollars
        feeAmt / 100,  // Convert fee amount to dollars
        item.netAmount / 100,  // Convert net amount to dollars
        item.processedDate,  // Deposit date
        item.comment,  // Comment
        item.sponsorName  // Matched by
      ];
  
      data.push(row);  // Add the row to the data array
    }
  
    // Create a new Google Spreadsheet and insert the data
    var cauze = SpreadsheetApp.create('Cauze Data - ' + today);
    cauze.getActiveSheet().getRange(1, 1, data.length, data[0].length).setValues(data);
    var url = cauze.getUrl();  // Get the URL of the newly created sheet
    console.log(url);  // Log the URL for debugging
  
    return url;  // Return the URL of the created sheet
  }
  
///should avoid storing passwords or API keys in the script!
///testmatch function calls console.log(today.sp), but today is a string so it has no sp
//does the granted function always exist in createCauzeSS
/// i added console.log() statements to help you debug the responses and the data flow.