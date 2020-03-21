var express = require('express');
var router = express.Router();
const asyncHandler = require("express-async-handler");
const db = require('../database');


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/**
 * @api {get} /health Health check
 * @apiName Health
 * @apiGroup Miscellaneous
 * @apiVersion 0.0.0
 * @apiDescription Endpoint to check if the service is up.
 * @apiSuccessExample Response (example):
 * HTTP/1.1 200 Success
{
  "status": "OK"
}
 */
router.get('/health', function(req, res, next) {
  return res.json({ status: 'OK' });
});

/**
 * @api {get} /nearby-location Locations nearby 
 * @apiName Nearby Locations
 * @apiGroup Miscellaneous
 * @apiVersion 0.0.0
 * @apiDescription Endpoint to retrieve nearby locations
 * @apiParam {String} [country] Optional Country to retrieve the stats for.
 * @apiSuccessExample Response (example):
 * HTTP/1.1 200 Success
{
  "status": "OK"
}
 */
router.get('/nearby-location', asyncHandler(async function (req, res, next) {
  const { country } = req.query;
  try {
    var latlng = [];
    const results = await getNearbyLocation(latlng);
    return res.json(results);
  }
  catch (error) {
    console.log('[/nearby-location] error', error);
    return res.json(error);
  }
}));

async function getNearbyLocation(latlng) {
  const conn = db.conn.promise();
  let query = '';
  const args = [];

  query = `SELECT text_show as title, source, reportedDate as createdAt, lat, lng, locationName, 
           FROM redangpow_markers ;
        `;
  

    // using like and % instead of =
    // because some country in the database has extra space/invisible character.
    // args.push(`%${country}%`);
  
  let result = await conn.query(query, args);
  console.log(result[0]);
  return result[0];
  // return result[0] && result[0][0] || { country, num_confirm: '?', num_dead: '?', num_heal: '?', created: null };
}

async function getTopStats(limit = 7) {
  limit = parseInt(limit);

  const conn = db.conn.promise();

  const query = `
SELECT 
  country,
  SUM(confirmed) AS num_confirm, 
  SUM(deaths) AS num_dead, 
  SUM(recovered) AS num_heal, 
  posted_date AS date
FROM arcgis 
GROUP BY country, posted_date 
HAVING posted_date = (SELECT MAX(posted_date) FROM arcgis)
ORDER BY num_confirm DESC
LIMIT ?
`;

  const args = [limit];

  let result = await conn.query(query, args);

  return result[0];
}



module.exports = router;
