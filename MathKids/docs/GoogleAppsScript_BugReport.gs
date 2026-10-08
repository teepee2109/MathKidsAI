const SPREADSHEET_ID =
  "1MdmG5RqMTJcUpQcqBkfz5OHoncotqcCr9QOhe5wOsNA";

const SHEET_NAME = "Bug Reports";

const WEBHOOK_SECRET =
  "MathKidsBugReport2026Secret";


function doPost(e) {
  try {
    const rawBody =
      e && e.postData && e.postData.contents
        ? e.postData.contents
        : "{}";

    const payload = JSON.parse(rawBody);

    // Check secret
    if (
      !payload.secret ||
      payload.secret !== WEBHOOK_SECRET
    ) {
      return jsonResponse({
        ok: false,
        message: "Unauthorized"
      });
    }

    const report = payload.report || {};

    // Description bắt buộc
    if (!String(report.description || "").trim()) {
      return jsonResponse({
        ok: false,
        message: "Description is required"
      });
    }

    // Open Google Sheet
    const spreadsheet =
      SpreadsheetApp.openById(SPREADSHEET_ID);

    // Lấy sheet Bug Reports
    let sheet =
      spreadsheet.getSheetByName(SHEET_NAME);

    // Nếu chưa có sheet thì tự tạo
    if (!sheet) {
      sheet =
        spreadsheet.insertSheet(SHEET_NAME);

      sheet.appendRow([
        "ID",
        "Submitted At",
        "Screen",
        "Priority",
        "Category",
        "Description",
        "Steps to Reproduce",
        "Expected Result",
        "Actual Result",
        "Contact",
        "Page URL",
        "User Role",
        "Browser",
        "Status"
      ]);

      // Header
      sheet
        .getRange(1, 1, 1, 14)
        .setFontWeight("bold");

      sheet.setFrozenRows(1);
    }

    // Generate bug ID
    const lastRow = sheet.getLastRow();

    const bugId =
      "BUG-" +
      String(Math.max(lastRow, 1))
        .padStart(4, "0");

    // Add bug
    sheet.appendRow([
      bugId,

      formatDate(report.submittedAt),

      report.screen || "Unknown",

      report.priority || "Medium",

      report.category || "Other",

      report.description || "",

      report.steps || "",

      report.expected || "",

      report.actual || "",

      report.contact || "",

      report.url || "",

      report.userRole || "Guest",

      report.browser || "",

      "Open"
    ]);

    // Format
    const newRow = sheet.getLastRow();

    sheet
      .getRange(newRow, 1, 1, 14)
      .setVerticalAlignment("top");

    return jsonResponse({
      ok: true,
      bugId: bugId
    });

  } catch (error) {

    return jsonResponse({
      ok: false,
      message: String(
        error.message || error
      )
    });
  }
}


function formatDate(value) {

  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    "yyyy-MM-dd HH:mm:ss"
  );
}


function jsonResponse(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}