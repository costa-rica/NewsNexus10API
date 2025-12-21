var express = require("express");
var router = express.Router();
const { authenticateToken } = require("../modules/userAuthentication");
const { createSpreadsheetFromArray } = require("../modules/excelExports");
const { safeFileExists } = require("../middleware/fileSecurity");
const path = require("path");
const fs = require("fs");

// 🔹 FORMERLY: GET /analysis/download-excel-file/:excelFileName - Download existing Excel file
// 🔹 NOW: GET /downloads/utilities/download-excel-file/:excelFileName - Download existing Excel file
router.get(
  "/utilities/download-excel-file/:excelFileName",
  authenticateToken,
  async (req, res) => {
    console.log(
      `- in GET /downloads/utilities/download-excel-file/${req.params.excelFileName}`
    );
    const { excelFileName } = req.params;

    try {
      // Get the directory path from environment variable
      const outputDir = process.env.PATH_TO_UTILITIES_ANALYSIS_SPREADSHEETS;
      if (!outputDir) {
        return res.status(500).json({
          result: false,
          message:
            "PATH_TO_UTILITIES_ANALYSIS_SPREADSHEETS environment variable not configured",
        });
      }

      // 🔒 Secure file path validation (prevents path traversal)
      const { valid, path: safePath, error } = safeFileExists(
        outputDir,
        excelFileName,
        { allowedExtensions: ['.xlsx', '.xls'] }
      );

      if (!valid) {
        return res.status(404).json({
          result: false,
          message: error || "File not found.",
        });
      }

      console.log(`Downloading file: ${safePath}`);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${path.basename(safePath)}"`
      );

      // Let Express handle download
      res.download(safePath, path.basename(safePath), (err) => {
        if (err) {
          console.error("Download error:", err);
          if (!res.headersSent) {
            res.status(500).json({
              result: false,
              message: "File download failed.",
            });
          }
        }
      });
    } catch (error) {
      console.error("Error processing request:", error);
      res.status(500).json({
        result: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

// 🔹 FORMERLY: POST /analysis/download-excel-file/:excelFileName - Create and download Excel file
// 🔹 NOW: POST /downloads/utilities/download-excel-file/:excelFileName - Create and download Excel file
router.post(
  "/utilities/download-excel-file/:excelFileName",
  authenticateToken,
  async (req, res) => {
    console.log(
      `- in POST /downloads/utilities/download-excel-file/${req.params.excelFileName}`
    );
    const { excelFileName } = req.params;
    const { arrayToExport } = req.body;

    const outputDir = process.env.PATH_TO_UTILITIES_ANALYSIS_SPREADSHEETS;
    if (!outputDir) {
      return res.status(500).json({
        result: false,
        message: "PATH_TO_UTILITIES_ANALYSIS_SPREADSHEETS not configured",
      });
    }

    // 🔒 Validate filename before creating file
    const { valid: isValidFilename, path: safePath, error: validationError } = safeFileExists(
      outputDir,
      excelFileName,
      { allowedExtensions: ['.xlsx', '.xls'] }
    );

    // For POST, we expect file might not exist yet, so just validate the path
    if (!safePath) {
      return res.status(400).json({
        result: false,
        message: validationError || "Invalid filename",
      });
    }

    console.log(`arrayToExport: ${typeof arrayToExport}`);
    console.log(`arrayToExport: ${arrayToExport[0]}`);

    await createSpreadsheetFromArray(arrayToExport, safePath);
    console.log(`✅ Excel file saved to: ${safePath}`);

    try {
      // Verify file was created
      if (!fs.existsSync(safePath)) {
        return res
          .status(404)
          .json({ result: false, message: "File not found." });
      } else {
        console.log(`----> File exists: ${safePath}`);
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${path.basename(safePath)}"`
      );

      // Let Express handle download
      res.download(safePath, path.basename(safePath), (err) => {
        if (err) {
          console.error("Download error:", err);
          res
            .status(500)
            .json({ result: false, message: "File download failed." });
        }
      });
    } catch (error) {
      console.error("Error processing request:", error);
      res.status(500).json({
        result: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);

module.exports = router;
