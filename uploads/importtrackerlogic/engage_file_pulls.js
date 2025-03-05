function getEngageFile(fileDate, des) {

    var url = 'https://engageusa-ftp.com/WebInterface/function/'; // GraphQL endpoint for login
    
    // Format the date for file searching (in MMddyyyy format) and Google Drive naming (in MM.dd.yy format)
    var dateString = Utilities.formatDate(fileDate,  "GMT-5", "MMddyyyy");
    var gFileName = `Engage ${des} ${Utilities.formatDate(fileDate,  "GMT-5", "MM.dd.yy")}`;
    console.log(gFileName); // Log the generated file name for reference
    var locale = 'PC'; // Default locale
    if (des == 'PAC') locale = 'NC'; // Change locale based on description (e.g., PAC -> NC)
  
    // Prepare the HTTP request options for logging in (POST request with payload and headers)
    var options = {
      'method': 'post',
      'payload': '',
      'headers': {
        'Accept': 'text/javascript, text/html, application/xml, text/xml, */*', // Accept all content types
        'X-Requested-With': 'XMLHttpRequest', // To mimic AJAX requests
        'Referer': 'https://engageusa-ftp.com/WebInterface/login.html', // Referrer header
        'Origin': 'https://engageusa-ftp.com', // Origin header for security
      },
      'muteHttpExceptions': true, // Prevent exceptions from stopping execution
      'followRedirects': true // Follow redirects automatically
    };
  
    // Login payload with credentials
    var payload = { 
      'command': 'login', // Command to log in
      'username': 'sbrock@reproductivefreedomforall.org', // Replace with your username
      'password': 'b93C6y',  // Replace with your password
      'encoded': 'true',
      'language': 'en',
      'random': Math.random().toString() // Random parameter for session
    };
  
    options.payload = payload; // Set login payload in the options
    var login = UrlFetchApp.fetch(url, options); // Send login request
    var cookies = login.getAllHeaders()['Set-Cookie']; // Extract cookies from the response
    var [c2f, crush] = cookies.map(cookie => cookie.match(/=(.+?);/)[1]); // Extract session cookies
  
    // Prepare options to get file list
    options.headers.Cookie = `currentAuth=${c2f}; CrushAuth=${crush}`; // Include session cookies in the request
    options.headers.Referer = options.headers.Origin + '/'; // Adjust the Referer header for security
    payload = {
      'command': 'getXMLListing', // Command to fetch the list of available files
      'path': `%2FEngage%20to%20${locale}%2F`,  // Path where files are stored, based on locale (PC or NC)
      'format': 'JSONOBJ', // Request the response in JSON format
      'c2f': c2f, // Include session cookies for authentication
      'random': Math.random().toString() // Random parameter for session
    };
  
    options.payload = payload; // Set the payload to get the file listing
    var listResponse = UrlFetchApp.fetch(url, options); // Send the request to get the file list
    var list = JSON.parse(listResponse.getContentText()).listing; // Parse the file list JSON response
    var fileName = list.filter(item => item.name.match(dateString))[0].name; // Find the file matching the date string
  
    // Prepare options to download the file
    options.method = 'get'; // Change method to GET for file download
    payload = {
      'command': 'download', // Command to download the file
      'path': `%2FEngage%20to%20${locale}%2F${fileName}`, // Path to the specific file
      'c2f': c2f, // Include session cookies for authentication
    };
  
    options.payload = payload; // Set the payload to download the file
    var downloadUrl = UrlFetchApp.fetch(url, options); // Send the request to download the file
    var blob = downloadUrl.getBlob(); // Get the file as a blob (binary large object)
    
    // File details to be uploaded to Google Drive
    var details = {
      name: gFileName, // Name of the file to be created in Google Drive
      mimeType: MimeType.GOOGLE_SHEETS // MIME type indicating it's a Google Sheet
    };
    
    var tbu = DriveApp.getFolderById('1LdlFA_L8_i4Q-v9q0ja2lsu_dfNtcGbe'); // Get the folder by ID to store the file in Google Drive
    var file = tbu.createFile(details, blob); // Create the file in the specified folder
    var fileUrl = `https://docs.google.com/spreadsheets/d/${file.getId()}`; // Get the URL of the newly created file
    
    console.log(fileUrl); // Log the file URL for reference
  
    return fileUrl; // Return the URL of the file
  }

  ///username and password are hardcoded in the script. cannot have hardcoded APIs or passwords
  ///maybe want to add error handling here
  ///path is used in the fetchFile function but is not defined, if its meant to be passed dynamically you'll have to change the function singature to accept the file path
  ///