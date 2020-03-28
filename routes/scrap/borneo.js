var express = require('express');
var router = express.Router();
const asyncHandler = require("express-async-handler");
const db = require('../../database');
const utils = require('../../utils/utils');
const axios = require('axios').default;

router.get('/borneo',async function(req, res, next){
    const {city} = req.query;
    let borneoUrl = "https://gs.kamfu.dev/?key=1sdM2oaFpP10KozA280r04wxwWhTOv1ZxvrbivkS8-Us&sheet="
    const borneo = [
        {location: "Sarawak", pageId: 2 },
        {location: "Sabah", pageId: 3 },
        {location: "Brunei", pageId: 4 },
        {location: "Kalimantan", pageId: 5 }
    ]
    let tmp = null
    for (item in borneo){
        tmp = await scrapFromKamfu( borneoUrl + borneo[item].pageId);
    }

    return res.json({ status: 'OK'});
  });

async function scrapFromKamfu (url){
    const conn = db.conn.promise();
    let query = ``
    let resultList = [];
    let currentDate = utils.getUTCDate();
    axios.get(
        url
    )
    .then( async (value)=>{
        let tmp, title;
        let list = value.data["results"];
        for(index in list){
            title= '';
            // CHECK data existed
            tmp = await conn.query(`SELECT locationName FROM borneo_markers WHERE city='${list[index]["City"]}' AND region='${list[index]["Region"]}'`, []);

            if(tmp[0][0] === undefined){
                query = `
                INSERT INTO 
                    borneo_markers (
                        createdBy,
                        email,
                        img_url,
                        city,
                        region,
                        lat,
                        lng,
                        locationName,
                        source,
                        text_show,
                        reportedDate,
                        scrapped,
                        last_updated,
                        downvote,
                        upvote,
                        active_cases,
                        total_confirmed,
                        total_deaths, 
                        total_recovered
                    )
                VALUES 
                    (
                        'T H',
                        'tanghoong.com@gmail.com', 
                        'https://scontent.fkul14-1.fna.fbcdn.net/v/t1.15752-0/p280x280/91144184_875827522890412_1891420249023053824_n.jpg?_nc_cat=104&_nc_sid=b96e70&_nc_ohc=e5DKLmahSe0AX-QhH4U&_nc_ht=scontent.fkul14-1.fna&_nc_tp=6&oh=6d0c37999a3a9780119c797af127c150&oe=5EA38A38',
                        '${list[index]["City"]}',
                        '${list[index]["Region"]}',
                        ${list[index]["Lat"]},
                        ${list[index]["Lng"]},
                        '[ ${list[index]["Level"]} ] - ${list[index]["City"]}, ${list[index]["Region"]}',
                        'https://kamfu.dev',
                        'Active Cases: ${("ActiveCases" in list[index])?((list[index]["ActiveCases"])?list[index]["ActiveCases"]:0):0}|Total Confirmed: ${("TotalConfirmed" in list[index])?((list[index]["TotalConfirmed"])?list[index]["TotalConfirmed"]:0):0}|Total Deaths: ${("TotalDeaths" in list[index])?((list[index]["TotalDeaths"])?list[index]["TotalDeaths"]:0):0}|Total Recovered: ${("TotalRecovered" in list[index])?((list[index]["TotalRecovered"])?list[index]["TotalRecovered"]:0):0}',
                        '${currentDate}',
                        1,
                        '${currentDate}',
                        0,
                        0,
                        ${("ActiveCases" in list[index])?((list[index]["ActiveCases"])?list[index]["ActiveCases"]:0):0},
                        ${("TotalConfirmed" in list[index])?((list[index]["TotalConfirmed"])?list[index]["TotalConfirmed"]:0):0},
                        ${("TotalDeaths" in list[index])?((list[index]["TotalDeaths"])?list[index]["TotalDeaths"]:0):0},
                        ${("TotalRecovered" in list[index])?((list[index]["TotalRecovered"])?list[index]["TotalRecovered"]:0):0}
                    )`;
            }else{
                query = `
                    UPDATE 
                        borneo_markers 
                    SET
                        text_show = 'Active Cases: ${("ActiveCases" in list[index])?((list[index]["ActiveCases"])?list[index]["ActiveCases"]:0):0}|Total Confirmed: ${("TotalConfirmed" in list[index])?((list[index]["TotalConfirmed"])?list[index]["TotalConfirmed"]:0):0}|Total Deaths: ${("TotalDeaths" in list[index])?((list[index]["TotalDeaths"])?list[index]["TotalDeaths"]:0):0}|Total Recovered: ${("TotalRecovered" in list[index])?((list[index]["TotalRecovered"])?list[index]["TotalRecovered"]:0):0}',
                        last_updated = '${currentDate}',
                        active_cases = ${("ActiveCases" in list[index])?((list[index]["ActiveCases"])?list[index]["ActiveCases"]:0):0},
                        total_confirmed = ${("TotalConfirmed" in list[index])?((list[index]["TotalConfirmed"])?list[index]["TotalConfirmed"]:0):0},
                        total_deaths = ${("TotalDeaths" in list[index])?((list[index]["TotalDeaths"])?list[index]["TotalDeaths"]:0):0},
                        total_recovered = ${("TotalRecovered" in list[index])?((list[index]["TotalRecovered"])?list[index]["TotalRecovered"]:0):0}
                    WHERE
                        city='${list[index]["City"]}' 
                        AND region='${list[index]["Region"]}'
                `;
            };
            tmp = await conn.query(query, []);
            resultList.push(tmp[0]);
        }
    })
    .catch(err => console.log(err));
    return resultList
  };

module.exports = router;