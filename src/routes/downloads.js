var express = require("express");
var router = express.Router();
const { authenticateToken } = require("../modules/userAuthentication");
const { createSpreadsheetFromArray } = require("../modules/excelExports");
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

      const filePathAndName = path.join(outputDir, excelFileName);

      // Check if file exists
      if (!fs.existsSync(filePathAndName)) {
        return res.status(404).json({
          result: false,
          message: "File not found.",
        });
      }

      console.log(`Downloading file: ${filePathAndName}`);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${excelFileName}"`
      );

      // Let Express handle download
      res.download(filePathAndName, excelFileName, (err) => {
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

    console.log(`arrayToExport: ${typeof arrayToExport}`);
    console.log(`arrayToExport: ${arrayToExport[0]}`);

    const outputFilePath = path.join(
      process.env.PATH_TO_UTILITIES_ANALYSIS_SPREADSHEETS,
      excelFileName
    );
    await createSpreadsheetFromArray(arrayToExport, outputFilePath);
    console.log(`✅ Excel file saved to: ${outputFilePath}`);

    try {
      const filePathAndName = path.join(
        process.env.PATH_TO_UTILITIES_ANALYSIS_SPREADSHEETS,
        excelFileName
      );

      // Check if file exists
      if (!fs.existsSync(filePathAndName)) {
        return res
          .status(404)
          .json({ result: false, message: "File not found." });
      } else {
        console.log(`----> File exists: ${filePathAndName}`);
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${excelFileName}"`
      );

      // Let Express handle download
      res.download(filePathAndName, excelFileName, (err) => {
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
