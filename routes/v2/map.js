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
  `;
  let result = await conn.query(query, []);
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
  try{
    let summaryVotes = await getSummaryVote();
    console.log(summaryVotes)
    let result = await updateSummary(summaryVotes)
    return res.json([result]);
  }catch(error){
    return res.json(results)
  }
});

async function getSummaryVote(){
  const conn = db.conn.promise();
  let query =``;
  query = `
    SELECT
      district,
      country,
      COUNT(DISTINCT CASE WHEN upvote = 1 THEN user_id ELSE NULL END) as upvote,
      COUNT(DISTINCT CASE WHEN downvote = 1 THEN user_id ELSE NULL END) as downvote
    FROM
      ${DB_NAME}.votes
    WHERE 
      reference = 'summary'
  `
  let result = await conn.query(query, [])
  return result[0]
}

async function updateSummary(votes){
  const conn = db.conn.promise();
  let query=``;
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
    `
    console.log(query)
    let result = await conn.query(query, [])
    return result[0]
  }
}


module.exports = router;
