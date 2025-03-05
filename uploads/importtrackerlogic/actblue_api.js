async function getActBlueReport() {
    // Open the target folder in Google Drive by its ID
    var tbu = DriveApp.getFolderById('13Kmk6QNhGt6ZbnKytWY_RjwbRNaBuTdZ');
  
    // ActBlue API credentials (these should be securely stored, not hardcoded)
    const CLIENT_UUID = '35f8532d-8435-465e-9385-8a4bb0185f7a'; // Replace with actual Client ID
    const CLIENT_SECRET = 'HuYiEayv5WL9AHMztlWUqfbX/rVkEdnjG05V2GwhcBkl9MnGvm8PRw=='; // Replace with actual Client Secret
    const BASE_URI = 'https://secure.actblue.com/api/v1';
  
    // Get today's date and calculate the date range for the past week
    var today = new Date();
    var ldate = Utilities.formatDate(new Date(today.setDate(today.getDate())), "GMT-5", "yyyy-MM-dd");
    var fdate = Utilities.formatDate(new Date(today.setDate(today.getDate() - 7)), "GMT-5", "yyyy-MM-dd");
    today = new Date(); // Reset today to the current date
  
    console.log(fdate + ' to ' + ldate); // Log date range
  
    // Request ActBlue for CSV report in the date range
    const createSheetUrl = BASE_URI + '/csvs';
    const createSheetResponse = UrlFetchApp.fetch(createSheetUrl, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Basic ' + Utilities.base64Encode(CLIENT_UUID + ':' + CLIENT_SECRET),
      },
      payload: JSON.stringify({
        csv_type: 'paid_contributions',
        date_range_start: fdate,
        date_range_end: ldate,
      }),
    });
  
    // Extract the sheet ID from API 
    const sheetId = JSON.parse(createSheetResponse.getContentText()).id;
  
    // Generate the URL to retrieve the generated CSV report
    var getSheetUrl = `${BASE_URI}/csvs/${sheetId}`;
    var data;
    
    // Poll ActBlue API until report is ready
    do {
      var getSheetResponse = UrlFetchApp.fetch(getSheetUrl, {
        method: 'get',
        headers: {
          Authorization: 'Basic ' + Utilities.base64Encode(CLIENT_UUID + ':' + CLIENT_SECRET),
        },
      });
  
      data = JSON.parse(getSheetResponse.getContentText());
      Utilities.sleep(2000); // Wait for 2 seconds before checking again
    } while (data.status == 'in_progress');
  
    // Retrieve CSV file
    var sheetUrl = data.download_url;
    var sheetResponse = UrlFetchApp.fetch(sheetUrl);
    var csvData = Utilities.parseCsv(sheetResponse.getContentText());
  
    // get summary variables
    var amt = 0;
    var ct = 0;
    var fees = 0;
  
    // Process CSV data, summing amounts and fees while filtering out invalid entries
    for (var i = 1; i < csvData.length; i++) {
      var rowAmt = parseFloat(csvData[i][2]); // Amount column
      var rowChk = csvData[i][24]; // Check number column
      var rowFee = parseFloat(csvData[i][59]); // Fees column
  
      if (rowChk == 0) {
        csvData.splice(i); // Remove invalid rows
      } else {
        amt += rowAmt;
        ct++;
        fees += rowFee;
      }
    }
  
    // Create a new Google Sheet for the report
    var ss = SpreadsheetApp.create('AB PAC ' + ldate);
    DriveApp.getFileById(ss.getId()).moveTo(tbu); // Move file to target folder
    var sheet = ss.getActiveSheet();
    
    // Write data to the new spreadsheet
    sheet.getRange(1, 1, csvData.length, csvData[0].length).setValues(csvData);
    
    // Generate the Google Sheet URL
    var url = 'https://docs.google.com/spreadsheets/d/' + ss.getId();
  
    // Capture the current timestamp
    const recd = new Date();
    var fy = recd.getFullYear();
    if (recd.getMonth() > 8) {
      fy++; // Adjust fiscal year if past August
    }
  
    // Format date for the filename
    var fileDate = Utilities.formatDate(new Date(today.setDate(today.getDate() - 1)), "GMT-5", "MM.dd");
    var source = 'ActBlue';
    var des = 'PAC';
    var freq = 'Weekly';
    var fileName = `${source} ${des} ${fileDate}`;
    var checkNum = csvData[1][24]; // Retrieve check number from first row
  
    // Prepare summary row for tracking spreadsheet
    var summary = [[
      recd, fileName, des, amt, ct, freq, fy, 
      `Disbursement Fees = ${fees.toFixed(2)}; Check Num = ${checkNum}`, 
      'In TBU', `=HYPERLINK("${url}", "File")`
    ]];
  
    Logger.log(summary); // Log summary data
  
    // Open tracking spreadsheet and append summary data
    var tracker = SpreadsheetApp.openById('17vCpedF3JLbLktr_cdmrv_U116GdTPvwqlCN6o7Nfgg').getActiveSheet();
    var nextRow = tracker.getLastRow() + 1;
    var range = tracker.getRange(nextRow, 1, 1, 10);
  
    range.setValues(summary); // Write summary data to tracking sheet
  }
  
  ///storing credentials in a hardcode is a security risk
  ///use .splice(i, 1) or filter the data before the loop in the csv splice bug
