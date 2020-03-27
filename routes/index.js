var express = require('express');
var router = express.Router();
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
