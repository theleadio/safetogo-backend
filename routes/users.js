var express = require('express');
var router = express.Router();
const asyncHandler = require("express-async-handler");
const db = require('../database');
var utils = require('../utils/utils');

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
  let result = await conn.query(query, args);
  return result[0]
}

async function createNewUser(user){
  const conn = db.conn.promise();
  let query = ''
  let current_date = utils.getUTCDate();
  query = `INSERT INTO safetogo_user (created_date, email, img_url, last_login, login_count, logout_date, name, post_count) VALUES 
  ('${current_date}','${user["email"]}','${user["img_url"]}','${current_date}',0,'','${user["name"]}',0)`
  let result = await conn.query(query, []);
  return result[0]
}

async function loginUser(user){
  const conn = db.conn.promise();
  let query = ''
  let current_date = utils.getUTCDate();
  query = `UPDATE safetogo_user SET last_login='${current_date}', login_count = login_count + 1, last_updated ='${current_date}' WHERE email='${user["email"]}'`
  let result = await conn.query(query, []);
  return result[0]
}

async function updateUser(user){
  const conn = db.conn.promise();
  let query = ''
  let current_date = utils.getUTCDate();
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
  let current_date = utils.getUTCDate();
  query = `UPDATE safetogo_user SET logout_date='${current_date}', last_updated ='${current_date}' WHERE user_id='${user["user_id"]}'`
  let result = await conn.query(query, []);
  return result[0]
}

module.exports = router;
