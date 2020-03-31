const axios = require('axios').default;

module.exports = {
    searchPlace: async (keyword) => {
        let placeUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${keyword}&inputtype=textquery&fields=formatted_address,geometry,icon,name,place_id,plus_code,types,rating&key=AIzaSyCSX2GHeYx7rVj6c71nzpKvbrqfseE16jw`

        let searchResult = await axios.get(placeUrl).then(res => res.data).catch(err=>console.log(err));
        return searchResult
    }
}



// {
//     "candidates": [
//        {
//           "formatted_address": "140 George St, The Rocks NSW 2000, Australia",
//           "geometry": {
//              "location": {
//                 "lat": -33.8599358,
//                 "lng": 151.2090295
//              },
//              "viewport": {
//                 "northeast": {
//                    "lat": -33.85824377010728,
//                    "lng": 151.2104386798927
//                 },
//                 "southwest": {
//                    "lat": -33.86094342989272,
//                    "lng": 151.2077390201073
//                 }
//              }
//           },
//           "icon": "https://maps.gstatic.com/mapfiles/place_api/icons/museum-71.png",
//           "name": "Museum of Contemporary Art Australia",
//           "photos": [
//              {
//                 "height": 3278,
//                 "html_attributions": [
//                    "<a href=\"https://maps.google.com/maps/contrib/104790014239029387558\">Museum of Contemporary Art Australia</a>"
//                 ],
//                 "photo_reference": "CmRaAAAA64FKualn0zp9WQSKKxSlhy_TKraoVjKr9rXGu190I3OWhhSNdWC2pwKCgaWHbCsK0z5dhnkAsDDlmxv5oxF3hUmvCv9_8pE30FWwT4my7e7ahMn5iJnypRfic0SVDkt1EhBOVpYiEtgonKgnKGqAFJyPGhSzBOzrdMfBDblbMVulB3Ch_MLKfQ",
//                 "width": 3543
//              }
//           ],
//           "place_id": "ChIJ68aBlEKuEmsRHUA9oME5Zh0",
//           "plus_code": {
//              "compound_code": "46R5+2J The Rocks, New South Wales, Australia",
//              "global_code": "4RRH46R5+2J"
//           },
//           "types": [
//              "art_gallery",
//              "tourist_attraction",
//              "cafe",
//              "museum",
//              "food",
//              "point_of_interest",
//              "store",
//              "establishment"
//           ]
//        }
//     ],
//     "status": "OK"
//  }