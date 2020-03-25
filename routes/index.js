var express = require('express');
var router = express.Router();
const asyncHandler = require("express-async-handler");
const db = require('../database');

function getUTCDate() {
  let d = new Date()
  let month = '' + (d.getUTCMonth() + 1);
  let day = '' + d.getUTCDate();
  let year = d.getUTCFullYear();
  let hour = ''+ d.getUTCHours();
  let min = '' + d.getUTCMinutes();
  let seconds = '' + d.getUTCSeconds();


  if (month.length < 2){month = '0' + month};
  if (day.length < 2){day = '0' + day};
  if (hour.length < 2){hour = '0' + hour};
  if (min.length < 2){min = '0' + min};
  if (seconds.length < 2){seconds = '0' + seconds};

  return [year, month, day].join('-') + ' ' + [hour, min, seconds].join(':');
}

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

  query = `
    SELECT text_show as title, source, DATE_FORMAT(CONVERT_TZ(reportedDate,'UTC','Asia/Kuala_Lumpur'), '%b %d, %Y %h:%i %p' ) as createdAt, lat, lng, locationName, upvote, downvote, createdBy, img_url FROM redangpow_markers 
      UNION
    SELECT title, source, DATE_FORMAT(CONVERT_TZ(reportedDate,'UTC','Asia/Kuala_Lumpur'), '%b %d, %Y %h:%i %p' ) AS createdAt, lat, lng, locationName, upvote, downvote, createdBy, img_url FROM safetogo_markers;
        `;
  

    // using like and % instead of =
    // because some country in the database has extra space/invisible character.
    // args.push(`%${country}%`);
  
  let result = await conn.query(query, args);
  return result[0];
  // return result[0] && result[0][0] || { country, num_confirm: '?', num_dead: '?', num_heal: '?', created: null };
}
// search-result
router.post('/signin',async function(req, res, next){
  const user = req.body;
  try{
    let result = await checkUserExist(user);
    if(result.length > 0){
      let votes = await getUserVotes(user);
      result = {
        user_id: result[0]["user_id"],
        votes: votes
      }
      let _ = loginUser(user);
      _ = updateUser(user);

    }else{
      result = await createNewUser(user);
    }
    return res.json(result);
  }catch(error){
    console.log('[/signin] error', error);
    return res.json(results)
  }
});

async function getUserVotes(user){
  const conn = db.conn.promise();
  let query = ''
  const args = []
  query = `SELECT lat, lng, upvote, downvote FROM votes WHERE email='${user["email"]}'`
  let result = await conn.query(query, args);
  return result[0]
}

async function checkUserExist(user){
  const conn = db.conn.promise();
  let query = ''
  const args = []
  query = `SELECT user_id FROM safetogo_user WHERE email='${user["email"]}'`
  console.log(query)
  let result = await conn.query(query, args);
  return result[0]
}

async function createNewUser(user){
  const conn = db.conn.promise();
  let query = ''
  let current_date = getUTCDate();
  query = `INSERT INTO safetogo_user (created_date, email, img_url, last_login, login_count, logout_date, name, post_count) VALUES 
  ('${current_date}','${user["email"]}','${user["img_url"]}','${current_date}',0,'','${user["name"]}',0)`
  let result = await conn.query(query, []);
  return result[0]
}

async function loginUser(user){
  const conn = db.conn.promise();
  let query = ''
  let current_date = getUTCDate();
  query = `UPDATE safetogo_user SET last_login='${current_date}', login_count = login_count + 1, last_updated ='${current_date}' WHERE email='${user["email"]}'`
  let result = await conn.query(query, []);
  return result[0]
}

async function updateUser(user){
  const conn = db.conn.promise();
  let query = ''
  let current_date = getUTCDate();
  query =`UPDATE 
            safetogo_user 
          SET post_count = (
            SELECT 
              COUNT(DISTINCT id)
            FROM
              safetogo_markers
            WHERE
              email = '${user["email"]}'
          ), last_updated ='${current_date}' 
          WHERE email='${user["email"]}'`
  let result = await conn.query(query, []);
  return result[0]
}


router.post('/signout',async function(req, res, next){
  const user = req.body;
  try{
    const result = await logoutUser(user);
    return res.json(result);
  }catch(error){
    console.log('[/signin] error', error);
    return res.json(results)
  }
});

async function logoutUser(user){
  // user_id only
  const conn = db.conn.promise();
  let query = ''
  let current_date = getUTCDate();
  query = `UPDATE safetogo_user SET logout_date='${current_date}', last_updated ='${current_date}' WHERE user_id='${user["user_id"]}'`
  let result = await conn.query(query, []);
  return result[0]
}

router.post('/vote',async function(req, res, next){
  const vote = req.body;
  try{
    let result = await insertVote(vote);
    let _ = updateMarker(vote)
    return res.json([result]);
  }catch(error){
    console.log('[/vote] error', error);
    return res.json(results)
  }
});

async function insertVote(vote){
  const conn = db.conn.promise();
  let query = ''
  let current_date = getUTCDate();
  query = `INSERT INTO votes (downvote, email, lat, lng, upvote, user_id, vote_date) VALUES 
  (${vote["downvotes"]}, '${vote["email"]}', ${vote["lat"]}, ${vote["lng"]}, ${vote["upvotes"]}, '${vote["user_id"]}', '${current_date}')`
  let result = await conn.query(query, []);
  return result[0]
}

async function updateMarker(vote){
  const conn = db.conn.promise();
  let query = ''
  let current_date = getUTCDate();
  let result = []
  let markerTables = ["redangpow_markers", "safetogo_markers"]
  for(let index in markerTables){
    query = `
    UPDATE 
      ${markerTables[index]}
    SET 
      upvote = (SELECT COUNT(DISTINCT user_id) FROM votes WHERE lat= ${vote["lat"]} AND lng = ${vote["lng"]} AND upvote = 1),
      downvote = (SELECT COUNT(DISTINCT user_id) FROM votes WHERE lat= ${vote["lat"]} AND lng = ${vote["lng"]} AND downvote = 1),
      last_updated = '${current_date}'
    WHERE
      lat= ${vote["lat"]} AND lng = ${vote["lng"]} 
    `
    let rlt = await conn.query(query, []);
    result.push(rlt);
  }
  return result
}

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
  let result = await conn.query(query, args);
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
