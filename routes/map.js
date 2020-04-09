var express = require('express');
var router = express.Router();
var utils = require('../utils/utils');
var gMap = require('../services/googleMap');
const asyncHandler = require("express-async-handler");
const db = require('../database');

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

router.get('/summary', asyncHandler(async function(req, res, next){
  const { country } = req.query;
  try {
    const results = await getSummary();
    return res.json(results);
  }
  catch (error) {
    console.log('[/summary] error', error);
    return res.json(error);
  }
}));

async function getSummary(){
  const conn = db.conn.promise();
  let query = '';
  query =`
  SELECT
    locationName,
    text_show as title,
    source,
    DATE_FORMAT(CONVERT_TZ(reportedDate,'UTC','Asia/Kuala_Lumpur'), '%b %d, %Y %h:%i %p' ) as createdAt,
    lat,
    lng,
    createdBy,
    img_url,
    upvote,
    downvote
  FROM
    safetogo.summary_markers
  WHERE total_confirmed > 0
UNION
    SELECT
    locationName,
    text_show as title,
    source,
    DATE_FORMAT(CONVERT_TZ(reportedDate,'UTC','Asia/Kuala_Lumpur'), '%b %d, %Y %h:%i %p' ) as createdAt,
    lat,
    lng,
    createdBy,
    img_url,
    upvote,
    downvote
  FROM
    safetogo.manual_summary_markers
    WHERE total_confirmed > 0
  `;
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
  let current_date = utils.getUTCDate();
  query = `INSERT INTO votes (downvote, email, lat, lng, upvote, user_id, vote_date) VALUES 
  (${vote["downvotes"]}, '${vote["email"]}', ${vote["lat"]}, ${vote["lng"]}, ${vote["upvotes"]}, '${vote["user_id"]}', '${current_date}')`
  let result = await conn.query(query, []);
  return result[0]
}

async function updateMarker(vote){
  const conn = db.conn.promise();
  let query = '';
  // let current_date = utils.getUTCDate();
  let result = [];
  let markerTables = [];
  if(vote["reference"] === "location"){
    markerTables = ["safetogo.redangpow_markers", "safetogo.safetogo_markers"]
  }else{
    markerTables = ["safetogo.summary_markers", "safetogo.manual_summary_markers"]
  }
  for(let index in markerTables){
    query = `
    UPDATE 
      ${markerTables[index]}
    SET 
      upvote = (SELECT COUNT(DISTINCT user_id) FROM votes WHERE lat= ${vote["lat"]} AND lng = ${vote["lng"]} AND upvote = 1),
      downvote = (SELECT COUNT(DISTINCT user_id) FROM votes WHERE lat= ${vote["lat"]} AND lng = ${vote["lng"]} AND downvote = 1)
    WHERE
      lat= ${vote["lat"]} AND lng = ${vote["lng"]} 
    `
    let rlt = await conn.query(query, []);
    result.push(rlt);
  }
  return result
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
  let query=`SELECT DISTINCT name, geometry_lat as lat, geometry_lng as lng, formatted_address FROM google_map_place WHERE name LIKE "%${keyword}%"`
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
  let query=`SELECT DISTINCT name, geometry_lat as lat, geometry_lng as lng, formatted_address FROM google_map_place WHERE name = "%${keyword}"`
  let result = await conn.query(query, []);
  return result[0];
}

async function searchGooglePlace(keyword){
  const result = await gMap.searchPlace(keyword);
  if(result["candidates"].length > 0){
    let current_date = utils.getUTCDate();
    let place = result["candidates"][0];
    const conn = db.conn.promise();
    let query = `
      INSERT INTO google_map_place (
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
        viewport_southwest_lng
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
        ${"viewport" in place["geometry"] ? ("southwest" in place["geometry"]["viewport"]? place["geometry"]["viewport"]["southwest"]["lng"]:null):null}
      )
    `
    let placeResult = {
      name: place["name"],
      lat: place["geometry"]["location"]["lat"],
      lng: place["geometry"]["location"]["lng"]
    }
    let dbResult = conn.query(query, []);
    return placeResult;
  }
  return {}
}

module.exports = router;