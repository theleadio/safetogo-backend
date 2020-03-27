var express = require('express');
var router = express.Router();
const asyncHandler = require("express-async-handler");
const db = require('../database');

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

module.exports = router;