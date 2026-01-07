var express = require("express");
var router = express.Router();
const {
  makeGNewsRequest,
  storeGNewsArticles,
  makeGNewsApiRequestDetailed,
} = require("../../modules/newsOrgs/requestsGNews");
const { checkBodyReturnMissing } = require("../../modules/common");
const { NewsArticleAggregatorSource } = require("newsnexus10db");
const logger = require("../../modules/logger");
// POST /gnews/request
router.post("/request", async (req, res) => {
  // logger.info("- starting request-gnews");
  try {
    const { startDate, endDate, keywordString } = req.body;

    const { isValid, missingKeys } = checkBodyReturnMissing(req.body, [
      "startDate",
      "endDate",
      "keywordString",
    ]);
    if (!isValid) {
      return res.status(400).json({
        result: false,
        message: `Missing ${missingKeys.join(", ")}`,
      });
    }
    // logger.info(`- got correct body ${JSON.stringify(req.body)}`);
    const gNewsSourceObj = await NewsArticleAggregatorSource.findOne({
      where: { nameOfOrg: "GNews" },
      raw: true, // Returns data without all the database gibberish
    });
    // logger.info(gNewsSourceObj);
    // const keywordObj = await Keyword.findOne({
    //   where: { keyword: keywordString },
    //   raw: true, // Returns data without all the database gibberish
    // });
    // const keywordObjModified = { ...keywordObj, keywordId: keywordObj.id };
    // logger.info(keywordObj);
    // // 2. make request
    // logger.info(`- making request`);
    const { requestResponseData, newsApiRequestObj } = await makeGNewsRequest(
      gNewsSourceObj,
      keywordString,
      startDate,
      endDate
    );

    // if (process.env.ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES === "false") {
    //   return res.status(200).json({
    //     result: true,
    //     newsApiRequestObj,
    //   });
    // } else {
    //   logger.info(
    //     `what is process.env.ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES: ${process.env.ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES}`
    //   );
    // }

    // // 3 save articles to db
    // logger.info(`- saving articles`);
    await storeGNewsArticles(requestResponseData, newsApiRequestObj);

    res.json({
      result: true,
      message: `Imported ## articles from GNews.`,
    });
  } catch (error) {
    logger.error("Error in /request-gnews:", error);
    res.status(500).json({
      result: false,
      message: "NewsNexusAPI internal server error",
      error: error.message,
    });
  }
});

// 🔹 POST /gnews/get-articles [OBE: POST /gnews/request-detailed]
router.post("/get-articles", async (req, res) => {
  const { startDate, endDate, keywordsAnd, keywordsOr, keywordsNot } = req.body;
  // Step 1: find NewsArticleAggregatorSource
  const gNewsSourceObj = await NewsArticleAggregatorSource.findOne({
    where: { nameOfOrg: "GNews" },
    raw: true, // Returns data without all the database gibberish
  });
  try {
    const { requestResponseData, newsApiRequestObj } =
      await makeGNewsApiRequestDetailed(
        gNewsSourceObj,
        startDate,
        endDate,
        keywordsAnd,
        keywordsOr,
        keywordsNot
      );

    if (process.env.ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES === "true") {
      if (requestResponseData.articles) {
        logger.info("- articles count: ", requestResponseData.articles.length);
        // Step 4: store articles to db

        await storeGNewsArticles(requestResponseData, newsApiRequestObj);
      } else {
        logger.info("--- > there was no articles element in the response ???/");
        return res.status(400).json({
          status: requestResponseData?.status || "error",
          result: false,
          message: requestResponseData?.message || "Failed to fetch articles",
        });
      }
    } else {
      logger.info("--- > ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES is false");
      logger.info(
        `requestResponseData: ${JSON.stringify(requestResponseData, null, 2)}`
      );
    }

    res.json({
      result: true,
      requestResponseData,
      newsApiRequestObj,
    });
  } catch (error) {
    logger.error("Error in /request-detailed-gnews:", error);
    res.status(500).json({
      result: false,
      message: "NewsNexusAPI internal server error",
      error: error.message,
    });
  }
});

module.exports = router;
