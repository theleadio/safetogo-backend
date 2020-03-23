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

  query = `SELECT text_show as title, source, reportedDate as createdAt, lat, lng, locationName 
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
// search-result

router.post('/search-result', asyncHandler(async function(req, res, next){
  const newSearch = req.body;
  try{
    const results = await createNewSearchEvent(newSearch);
    return res.json(results);
  }catch(error){
    console.log('[/search-result] error', error);
    return res.json(results)
  }
}));
// road: 'Kuala Lumpur',
// suburb: 'Burol Main',
// village: 'Summerwind Village 4',
// city: 'Dasmarinas',
// state: 'Cavite',
// postcode: '4114',
// country: '菲律宾',
// country_code: 'ph'
// fast_food: 'Kuala Lumpur',
// house_number: '33',
// road: 'Hauptstraße',
// residential: 'Lamspringe',
// suburb: 'Ziegelhütte',
// village: 'Lamspringe',
// county: 'Landkreis Hildesheim',
// state: 'Lower Saxony',
// postcode: '31195',
// country: 'Germany',
// country_code: 'de'
// neighbourhood: 'KK Subdivision',

async function createNewSearchEvent(newSearch){
  const conn = db.conn.promise();
  let query = ``
  let resultList = []
  const args = []
  let searched_result = newSearch["searched_result"]
  for(let index in searched_result){
    console.log(searched_result[index])
    query = `INSERT INTO searched_location (boundingbox, class, country, country_code, created_date, display_name, icon_url, importance, lat, lng, 
      licence, place_id, searched_by, state, road, suburb, village, city, postcode, fast_food, residential, neighbourhood, user_email, user_id) VALUES (
        '${searched_result[index]['boundingbox']}', 
        '${searched_result[index]['class']}',
        '${searched_result[index]['address']['country']}',
        '${searched_result[index]['address']['country_code']}',
        '${newSearch['created_date']}',
        '${searched_result[index]['display_name']}',
        '${searched_result[index]['icon']}',
        '${searched_result[index]['importance']}',
         ${searched_result[index]['lat']},
         ${searched_result[index]['lon']},
        '${searched_result[index]['licence']}',
        ${searched_result[index]['place_id']},
        '${(searched_result[index]['address']['state'])?searched_result[index]['address']['state']:""}',
        '${(searched_result[index]['address']['road'])?searched_result[index]['address']['road']:""}',
        '${(searched_result[index]['address']['suburb'])?searched_result[index]['address']['suburb']:""}',
        '${(searched_result[index]['address']['village'])?searched_result[index]['address']['village']:""}',
        '${(searched_result[index]['address']['city'])?searched_result[index]['address']['city']:""}',
        '${(searched_result[index]['address']['postcode'])?searched_result[index]['address']['postcode']:""}',
        '${(searched_result[index]['address']['fast_food'])?searched_result[index]['address']['fast_food']:""}',
        '${(searched_result[index]['address']['residential'])?searched_result[index]['address']['residential']:""}',
        '${(searched_result[index]['address']['neighbourhood'])?searched_result[index]['address']['neighbourhood']:""}',
        '${(newSearch['searched_by'])? newSearch['searched_by']: ""}',
        '${(newSearch['user_email'])? newSearch['user_email']: ""}',
        '${(newSearch['user_id'])? newSearch['user_id']: ""}'
        )`
    let result = await conn.query(query, args);
    console.log(result[0])
    resultList.push(result[0])
  }
  return resultList
}

/**
 * @api {get} /new-post Create new pin points 
 * @apiName Create New Pins
 * @apiGroup Miscellaneous
 * @apiVersion 0.0.0
 * @apiDescription Endpoint to create new pin points
 * @apiParam {Object} Form data .
 * @apiSuccessExample Response (example):
 * HTTP/1.1 200 Success
{
  "status": "OK"
}
 */
router.post('/new-post', asyncHandler(async function (req, res, next){
  const newPost = req.body;
  try{
    console.log(req.body)
    const results = await insertNews(newPost);
    return res.json(results)
  }
  catch(error){
    console.log('[/new-post] error', error);
    return res.json(error);
  }
}));

async function insertNews(newPost){
  const conn = db.conn.promise();
  let query = ''
  const args = []
  query = `INSERT INTO safetogo_markers (title, content, source, createdBy, email, img_url, locationName, lat, lng, reportedDate) VALUES 
  ('${newPost["title"]}', '${newPost["content"]}', '${newPost["source"]}', '${newPost["createdBy"]}',
  '${newPost["email"]}', '${newPost["img_url"]}', '${newPost["locationName"]}', ${newPost["lat"]}, ${newPost["lng"]}, '${newPost["reportedDate"]}')`
  console.log(query)
  let result = await conn.query(query, args);
  console.log(result[0])
  return result[0]
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
