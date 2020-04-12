var express = require('express');
var router = express.Router();
var utils = require('../../utils/utils');
var gMap = require('../../services/googleMap');
const asyncHandler = require("express-async-handler");
const db = require('../../database');
const DB_NAME = "safetogo"

router.get('/summary', asyncHandler(async function(req, res, next){
  const country = req.query.country;
    try {
      const results = await getSummary(country);
      return res.json(results);
    }
    catch (error) {
      console.log('[/summary] error', error);
      return res.json(error);
    }
  }));
  
async function getSummary(country, district){
  const conn = db.conn.promise();
  let query = '';
  query =`
  SELECT
      *
  FROM
      ${DB_NAME}.district_summary_markers
  WHERE
    country = '${country}'
  `;
  let result = await conn.query(query, []);
  return result[0]
}

router.get('/cases', asyncHandler(async function(req, res, next){
  const country = req.query.country;
  try {
    const results = await getCasesByCountry(country);
    return res.json(results);
  }
  catch (error) {
    console.log('[/cases] error', error);
    return res.json(error);
  }
}));

async function getCasesByCountry(country){
  const conn = db.conn.promise();
  let query = `
  SELECT
    id,
    country,
    district,
    lat,
    lng,
    upvote,
    downvote,
    createdBy,
    img_url,
    locationName,
    description as content
  FROM
    safetogo.redangpow_markers
  WHERE
    country = '${country}'
  UNION
  SELECT
    id,
    country,
    district,
    lat,
    lng,
    upvote,
    downvote,
    createdBy,
    img_url,
    locationName,
    content
  FROM
    safetogo.safetogo_markers
  WHERE
    country = '${country}'

  `;
  let result = await conn.query(query, []);
  return result[0]
}

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
  query = `INSERT INTO ${DB_NAME}.safetogo_markers (title, content, source, createdBy, email, img_url, locationName, lat, lng, reportedDate, country, district) VALUES 
  ('${newPost["title"]}', '${newPost["content"]}', '${newPost["source"]}', '${newPost["createdBy"]}',
  '${newPost["email"]}', '${newPost["img_url"]}', '${newPost["locationName"]}', ${newPost["lat"]}, ${newPost["lng"]}, '${newPost["reportedDate"]}', '${newPost["country"]}', '${newPost["state"]}')`
  let result = await conn.query(query, args);
  return result[0]
}

router.post('/vote',async function(req, res, next){
  const vote = req.body;
  try{
    let result = await insertVote(vote);
    vote["reference"] === "summary"? updateSummary(vote):updateCaseMarker(vote);
    return res.json([result]);
  }catch(error){
    console.log('[/vote] error', error);
    return res.json(results)
  }
});

async function insertVote(vote){
  const conn = db.conn.promise();
  let query = ''
  let current_date = utils.getUTCDate();
  query = `INSERT INTO ${DB_NAME}.votes (downvote, case_id, upvote, user_id, district, country, reference, vote_date) VALUES 
  (${vote["downvote"]}, ${vote["case_id"]}, ${vote["upvote"]}, ${vote["user_id"]}, '${vote["district"]}', '${vote["country"]}', '${vote["reference"]}','${current_date}')`
  let result = await conn.query(query, []);
  return result[0]
}

async function updateSummary(vote){
  const conn = db.conn.promise();
  let result = [];
  let markerTables = [`${DB_NAME}.district_summary_markers`];
  for(let index in markerTables){
    query = `
    UPDATE 
      ${markerTables[index]}
    SET 
      upvote = (SELECT COUNT(DISTINCT user_id) FROM ${DB_NAME}.votes WHERE district= '${vote["district"]}' AND country = '${vote["country"]}' AND reference = '${vote["reference"]}' AND upvote = 1),
      downvote = (SELECT COUNT(DISTINCT user_id) FROM ${DB_NAME}.votes WHERE district= '${vote["district"]}' AND country = '${vote["country"]}' AND reference = '${vote["reference"]}' AND downvote = 1)
    WHERE
      district= '${vote["district"]}' AND country = '${vote["country"]}'
    `;
    let rlt = await conn.query(query, []);
    result.push(rlt);
  }
  return result
}

async function updateCaseMarker(vote){
  const conn = db.conn.promise();
  let query = '';
  // let current_date = utils.getUTCDate();
  let result = [];
  let markerTables = [`${DB_NAME}.redangpow_markers`, `${DB_NAME}.safetogo_markers`]
  for(let index in markerTables){
    query = `
    UPDATE 
      ${markerTables[index]}
    SET 
      upvote = (SELECT COUNT(DISTINCT user_id) FROM ${DB_NAME}.votes WHERE case_id = ${vote["case_id"]} AND reference = '${vote["reference"]}' AND upvote = 1),
      downvote = (SELECT COUNT(DISTINCT user_id) FROM ${DB_NAME}.votes WHERE case_id = ${vote["case_id"]} AND reference = '${vote["reference"]}' AND downvote = 1)
    WHERE
      case_id = ${vote["case_id"]} AND reference = '${vote["reference"]}' 
    `
    console.log(query);
    let rlt = await conn.query(query, []);
    result.push(rlt);
  }
  return result
}

router.get('/votes/update', async function(req,res,next){

  const reference = req.query.reference;
  try{
    let votes = await getVote(reference);
    let result = await reference==='summary'? updateSummary(votes) : updateRedangpow(votes);
    return res.json([result]);
  }catch(error){
    return res.json(results)
  }
});

async function getVote(reference){
  const conn = db.conn.promise();
  let query =``;
  query = `
    SELECT
      district,
      country,
      case_id,
      COUNT(DISTINCT CASE WHEN upvote = 1 THEN user_id ELSE NULL END) as upvote,
      COUNT(DISTINCT CASE WHEN downvote = 1 THEN user_id ELSE NULL END) as downvote
    FROM
      ${DB_NAME}.votes
    WHERE 
      reference = '${reference}'
    GROUP BY 1,2,3
  `;
  let result = await conn.query(query, []);
  return result[0]
}

async function updateSummary(votes){
  const conn = db.conn.promise();
  let query=``;
  let result = null;
  for (let i in votes){
    query =
    `
      UPDATE
        ${DB_NAME}.district_summary_markers
      SET
        upvote = ${votes[i]["upvote"]},
        downvote = ${votes[i]["downvote"]}
      WHERE
        district = '${votes[i]["district"]}' AND country = '${votes[i]["country"]}'
    `;
    result = await conn.query(query, []);
  }
  return result[0]
}

async function updateRedangpow(votes){
  const conn = db.conn.promise();
  let query=``;
  let result = null;
  for (let i in votes){
    query =
    `
      UPDATE
        ${DB_NAME}.redangpow_markers
      SET
        upvote = ${votes[i]["upvote"]},
        downvote = ${votes[i]["downvote"]}
      WHERE
        id = ${votes[i]["case_id"]}
    `;
    result = await conn.query(query, []);
  }
  return result[0]
}


router.get('/suggest', asyncHandler(async function(req, res, next){
  try{
    const place = req.query.place_name;
    const result = await suggestPlace(place);
    return res.json(result);
  }catch(error){
    console.log('[/suggest] error', error);
    return res.json(error);
  }
}));

async function suggestPlace(keyword){
  const conn = db.conn.promise();
  let query=`SELECT DISTINCT name, geometry_lat as lat, geometry_lng as lng, formatted_address, country, state FROM ${DB_NAME}.google_map_place WHERE name LIKE "%${keyword}%"`
  let result = await conn.query(query, []);
  return result[0];
}

router.get('/search', asyncHandler(async function(req, res, next){
  try{
    const place = req.query.place_name;
    let result = await searchPlace(place);

    if(result.length === 0){
      result = await searchGooglePlace(place);
    }
    return res.json(result);
  }catch(error){
    console.log('[/search] error',error);
    return res.json(error);
  }
}));

async function searchPlace(keyword){
  const conn = db.conn.promise();
  let query=`SELECT DISTINCT name, geometry_lat as lat, geometry_lng as lng, formatted_address, country, state FROM ${DB_NAME}.google_map_place WHERE name = "%${keyword}"`
  let result = await conn.query(query, []);
  return result[0];
}


async function searchGooglePlace(keyword){
  const result = await gMap.searchPlace(keyword);
  try{
    if(result["candidates"].length > 0){
      let current_date = utils.getUTCDate();
      let place = result["candidates"][0];
      let address = ("formatted_address" in place ? place["formatted_address"]: '').split(",");
      const conn = db.conn.promise();
      let query = ``
      query =`SELECT place_id FROM ${DB_NAME}.google_map_place WHERE place_id = '${place["place_id"]}'`
      let dbResult = await conn.query(query, []);
      if(dbResult[0].length === 0){
        query=`
          INSERT INTO ${DB_NAME}.google_map_place (
            compound_code, 
            created_date, 
            formatted_address, 
            geometry_lat, 
            geometry_lng, 
            global_code,
            icon, 
            name,
            place_id,
            rating,
            search_count,
            types,
            viewport_northeast_lat,
            viewport_northeast_lng,
            viewport_southwest_lat,
            viewport_southwest_lng, 
            country,
            state
          )
          VALUES (
            '${("plus_code" in place) ? ("compound_code" in place["plus_code"]) ? place["plus_code"]["compound_code"]: '' : ''}',
            '${current_date}', 
            '${("formatted_address" in place ? place["formatted_address"]: '')}', 
            ${place["geometry"]["location"]["lat"]}, 
            ${place["geometry"]["location"]["lng"]}, 
            '${("plus_code" in place) ? ("global_code" in place["plus_code"]) ? place["plus_code"]["global_code"]: '' : ''}',
            '${"icon" in place ? place["icon"]: ''}', 
            '${place["name"]}',
            '${"place_id" in place ? place["place_id"]: ''}',
            ${"rating" in place ? place["rating"]: 0},
            0,
            '${"types" in place ? place["types"].toString() :''}',
            ${"viewport" in place["geometry"] ? ("northeast" in place["geometry"]["viewport"]? place["geometry"]["viewport"]["northeast"]["lat"]:null):null},
            ${"viewport" in place["geometry"] ? ("northeast" in place["geometry"]["viewport"]? place["geometry"]["viewport"]["northeast"]["lng"]:null):null},
            ${"viewport" in place["geometry"] ? ("southwest" in place["geometry"]["viewport"]? place["geometry"]["viewport"]["southwest"]["lat"]:null):null},
            ${"viewport" in place["geometry"] ? ("southwest" in place["geometry"]["viewport"]? place["geometry"]["viewport"]["southwest"]["lng"]:null):null},
            '${address.length > 1 ? address[address.length - 1].trim(): ""}',
            '${address.length > 1 ? address[address.length - 2].trim(): ""}'
          )
        `
        dbResult = conn.query(query, []);
      }
      
      let placeSearch = {
        name: place["name"],
        lat: place["geometry"]["location"]["lat"],
        lng: place["geometry"]["location"]["lng"],
        country: address.length > 1 ? address[address.length - 1].trim(): place["place_id"],
        state: address.length > 1 ? address[address.length - 2].trim(): place["place_id"],
      }
      return placeSearch
    }
    return {}
  }catch (error){
    console.log('[/searchGooglePlace] error',error);
    return res.json(error);
  }
}

module.exports = router;
