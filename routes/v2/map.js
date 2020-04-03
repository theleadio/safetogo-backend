var express = require('express');
var router = express.Router();
var utils = require('../../utils/utils');
var gMap = require('../../services/googleMap');
const asyncHandler = require("express-async-handler");
const db = require('../../database');

router.get('/polygon', asyncHandler(async function(req, res, next){
    const { country } = req.query;
    try {
      const results = await getSummary();
      return res.json(results);
    }
    catch (error) {
      console.log('[/polygon] error', error);
      return res.json(error);
    }
  }));
  
  async function getSummary(){
    const conn = db.conn.promise();
    let query = '';
    query =`SELECT
    geojson.region,
    geojson.geojson,
    CASE WHEN sMarkers.zone is null then "red" ELSE sMarkers.zone END as zone
FROM
(
    (
        SELECT 
            region, 
            country, 
            geojson,
            validate
        FROM 
            safetogo_dev.polygon_geojson
        where validate = 1
    ) geojson 
    LEFT JOIN
    (
        SELECT
            region,
              zone
          FROM
              safetogo.summary_markers
          UNION
          SELECT
              region,
              zone
          FROM
              safetogo.manual_summary_markers
    ) as sMarkers
    ON 
    geojson.region = sMarkers.region 
  ) 
    `;
    let result = await conn.query(query, []);
    return result[0]
  }
  module.exports = router;
