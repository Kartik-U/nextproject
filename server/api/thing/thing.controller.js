/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /things              ->  index
 * POST    /things              ->  create
 * GET     /things/:id          ->  show
 * PUT     /things/:id          ->  update
 * DELETE  /things/:id          ->  destroy
 */

'use strict';
var async = require('async');
var _ = require('lodash');
var crypto = require('crypto');

var Thing = require('./thing.model');

var M = 200; //let the num of buckets be 45 for now.
var placeIds = [];
var gPlacesRespArr = [];
var gPlacesArrCtr = 0;

// Get list of things
exports.index = function(req, res) {
  console.log("inside exports.index");
  //return res.json(200, '');
  Thing.find(function (err, things) {
    if(err) { return handleError(res, err); }
    return res.json(200, things);
  });
};

// Get a single thing
exports.show = function(req, res) {
  Thing.findById(req.params.id, function (err, thing) {
    if(err) { return handleError(res, err); }
    if(!thing) { return res.send(404); }
    return res.json(thing);
  });
};

// Creates a new thing in the DB.
exports.create = function(req, res) {
  Thing.create(req.body, function(err, thing) {
    if(err) { return handleError(res, err); }
    return res.json(201, thing);
  });
};

function parseGDirectionsResp(jsonResp) {
  var gDirectionResp = JSON.parse(jsonResp);
  //console.log("Printing out obj: " + obj);
  console.log("Printing out NE lat: " + gDirectionResp.routes[0].bounds.northeast.lat);
  var locations_gplaces = [];
  var locations_gplaces_ctr = 0;
  //there is only one route returned for our current request
  //iterate over routes
  for(var routeCtr = 0; routeCtr < gDirectionResp.routes.length; routeCtr++)
  {
    var route = gDirectionResp.routes[routeCtr];
    //iterate over legs
    for(var legCtr = 0; legCtr < route.legs.length; legCtr++)
    {
      var leg = route.legs[legCtr];
      //...and over steps in each leg
      for(var stepCtr = 0; stepCtr < leg.steps.length; stepCtr++)
      {
        //calculate and store the mid-point for each step.
        //TODO: ignore if distance is < 0.5 km. value gives us distance in meters calculate accordingly.
        var step = leg.steps[stepCtr];

        var distance_text = step.distance.text;
        var distance_arr = distance_text.split(" ");
        var dist = parseFloat(distance_arr[0],10);
        console.log("dist: "+dist);
        if(dist < 0.5)
        {
          continue;
        }
        if(dist > 5)
        {
          //TODO need to change heuristic so that we don't fire too many gplaces requests.
          //divide dist by some number so that result yields a reasonable number of gplaces requests
          //record multiple lat and lng so that we fire multiple requests for large distances
          //fire a fixed number of requests, evenly spaced. Use pagination to get more results if desired.
          //for example, if we fire 5 requests for a distance of 200 miles. each request should be at a waypoint of 40 miles distance.
          //fire one every 2 miles/km
          while(dist > 0)
          {
            var lat = (step.end_location.lat + step.start_location.lat)/2;
            var lng = (step.end_location.lng + step.start_location.lng)/2;
            var avg_location = new function() {
              this.lat = 0;
              this.lng = 0;
            };
            avg_location.lat = lat;
            avg_location.lng = lng;
            locations_gplaces[locations_gplaces_ctr++] = avg_location;
            dist = dist - 2;
          }

          continue;
        }

        var lat = (step.end_location.lat + step.start_location.lat)/2;
        var lng = (step.end_location.lng + step.start_location.lng)/2;
        var avg_location = new function() {
          this.lat = 0;
          this.lng = 0;
        };
        avg_location.lat = lat;
        avg_location.lng = lng;
        //store it
        locations_gplaces[locations_gplaces_ctr++] = avg_location;
      }//step
    }//leg
  }//route

  return locations_gplaces;
}



//calculates a route between a and b, and highlights the restaurants on the way
exports.getDirections = function(req, res, next) {
    var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
    var xmlhttp = new XMLHttpRequest();
    var locations = req.body.locations;
    var from = locations['from'];
    var to = locations['to'];
    console.log("from: "+from+" to: "+to);
    //var url = "https://maps.googleapis.com/maps/api/directions/json?origin=" + "San Jose" + "&destination=" + "Santa Clara" + "&sensor=false&key=AIzaSyAj1iVMUQA8zawncTbZrePBv3JAFIlP52A";
    var url = "https://maps.googleapis.com/maps/api/directions/json?origin=" + from + "&destination=" + to + "&sensor=false&key=AIzaSyAj1iVMUQA8zawncTbZrePBv3JAFIlP52A"
 
    xmlhttp.open("GET", url ,true);
    xmlhttp.onload = function() {
        console.log("Status: " + xmlhttp.status);
          //console.log('Response from CORS request to ' + url + ': ' + title);
        console.log('Response Text GDirections: ' + xmlhttp.responseText);
        res.jsonResp = xmlhttp.responseText;
        //get the lat and lng to query gPlaces API with
        var locations_gPlaces_req = parseGDirectionsResp(res.jsonResp);
        //var locations_gPlaces_req = foo(res.jsonResp);
        res.locations_gPlaces_req = locations_gPlaces_req;
        res.gPlacesUrl = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=37.3524531,-121.9544701&radius=500&types=food&sensor=false&key=AIzaSyAj1iVMUQA8zawncTbZrePBv3JAFIlP52A";

        //console.log('Response: ' + xmlhttp.Response);
        return next();
        //}
    };
     xmlhttp.onerror = function() {
        console.log('there was an error with CORS request');
        console.log('Status: ' + xmlhttp.status + 'ResponseText: ' + xmlhttp.responseText + 'Response: ' + xmlhttp.Response);
        return next(new Error(xmlhttp.responseText));
      //alert('Status:' + xmlhttp.status);
      //alert('ResponseText:' + xmlhttp.responseText);
      //alert('Response: ' + xmlhttp.Response);
      };
      //reqHandler.GDirectionsReq(xmlhttp);
    xmlhttp.send();
    console.log("Response: " + res);
        // res.render('index', { title: 'Eat on the way',
        //   locals: {
        //     GDirectionsResp : xmlhttp.responseText
        //   }
        // } );
};

exports.getPlaces = function(req, res) {
    console.log("Headers: " + res.headers)
    // res.render('index', { title: 'Eat on the way' });
    console.log('after first xmlhttp request');

    var locations_gPlaces_req = res.locations_gPlaces_req;
    console.log('number of gplaces requests: '+locations_gPlaces_req.length);
    var gPlacesUrlArr = [];
    for(var ctr = 0; ctr < locations_gPlaces_req.length; ctr++)
    {
      // console.log("Lat: " + locations_gPlaces_req[ctr].lat);
      // console.log("Lng: " + locations_gPlaces_req[ctr].lng);
      gPlacesUrlArr[ctr] = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location="+locations_gPlaces_req[ctr].lat+","+locations_gPlaces_req[ctr].lng+"&radius=500&types=food&sensor=false&key=AIzaSyAj1iVMUQA8zawncTbZrePBv3JAFIlP52A";
      //gPlaces(gPlacesUrl);
    }
     async.series([
      function(callback)
      {
        async.forEach(gPlacesUrlArr, function(gPlacesUrl, callback) {
          // console.log("Lat: " + location_gPlaces_req.lat);
          // console.log("Lng: " + location_gPlaces_req.lng);
          // var gPlacesUrl = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location="+location_gPlaces_req.lat+","+location_gPlaces_req.lng+"&radius=500&types=food&sensor=false&key=AIzaSyAj1iVMUQA8zawncTbZrePBv3JAFIlP52A";
          var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
          // var xmlhttp = new XMLHttpRequest();
          console.log("gPlacesUrl: "+gPlacesUrl);

          var gPlacesReq = new XMLHttpRequest();
          gPlacesReq.open("GET", gPlacesUrl ,true);
          gPlacesReq.send();
          //the problem is that examples such as db.get('users', userId, function(err, user) { ... } actually do the db get
          // and then call the callback once done. Here we are just sending the request, then registering the callback to be called
          // once the request is loaded with a response. gPlacesReq.send() will be done immediately, and the onload function will be called
          // only once the response has been received from the remote server.
          gPlacesReq.onload = function() {  
            //    console.log("Status: " + gPlacesReq.status);
            gPlacesRespArr[gPlacesArrCtr++] = gPlacesReq.responseText;
            //console.log("GPlaces response: " + gPlacesReq.responseText);
            callback();
          };
          gPlacesReq.onerror = function() {
            console.log('there was an error with CORS request');
            console.log('Status: ' + gPlacesReq.status + 'ResponseText: ' + gPlacesReq.responseText + 'Response: ' + gPlacesReq.Response);
            callback(gPlacesReq.responseText);
              //alert('Status:' + xmlhttp.status);
              //alert('ResponseText:' + xmlhttp.responseText);
              //alert('Response: ' + xmlhttp.Response);
            };
          //gPlaces(gPlacesUrl,next);
        }, callback);
      },
      function(callback) {
        //check if we received as many responses as the number of requests we sent
        if(gPlacesRespArr.length != locations_gPlaces_req.length)
        {
          //TODO: throw an error
          console.log("Did not receive as many responses["+gPlacesRespArr.length+"] as requests["+locations_gPlaces_req.length+"]");
        }
        console.log("gplaces response arr length: " +gPlacesRespArr.length);
        var total_num_results = 0;
        for(var ctr = 0; ctr < gPlacesRespArr.length; ctr++)
        {
          var gPlacesResp = JSON.parse(gPlacesRespArr[ctr]);
          var results = gPlacesResp.results;
          // console.log("number of results: "+results.length);
          total_num_results += results.length;
        }

        console.log("total number of results: "+total_num_results);
          //go over the responses from google places API
          //TODO: as we go over the responses, store the place ids in a hash table. If we have seen the place id before, do not store details of the place
        var placeIdArr = [];
        var placeInfoArr = [];
        var placeIdCtr = 0;
        var map = new Object();
        var places = [];
        var placesCtr = 0;
        for(var ctr = 0; ctr < gPlacesRespArr.length; ctr++)
        {
          var gPlacesResp = JSON.parse(gPlacesRespArr[ctr]);
          //console.log("gPlacesResp: " +gPlacesResp);
          //console.log("displaying legacy id: " +gPlacesResp.results[0].id);
          //var results = [];
          //parse the response to get the place id for each place returned.
          
          var results = gPlacesResp.results;
          //console.log("results: "+results);
          
          
          // var placeIdList = [];
          // var placeIdCtr = 0;

          //var mapCtr = 1;
          
          //var current_result = {};
          //res.places = [];
          
          for(var resCtr = 0; resCtr < results.length; resCtr++)
          {
            var current_result = results[resCtr];
            var place_id = current_result.place_id;
            var hash = crypto.createHash('md5').update(place_id).digest('hex');

            // console.log("place_id: "+ place_id);
            // console.log("current_result.opening_hours: "+current_result.opening_hours);

            // placeIdList.push(place_id);

            // console.log("hash: "+hash);
            //only add it to the result if it is not a duplicate result and the place is open right now.  
            if(!map.hasOwnProperty(hash))
            {
                if(current_result.opening_hours != undefined && current_result.opening_hours.open_now == false)
                {
                  // console.log("place not open now: "+current_result.name);
                  continue;
                }
                var current_place = {};
                //res.places[placesCtr] = {};
                //var current_place =  res.places[placesCtr];
                map[hash] = place_id;
                current_place.place_id = place_id;
                current_place.geometry = current_result.geometry;
                current_place.name = current_result.name;
                current_place.icon_link = current_result.icon;
                current_place.rating = current_result.rating;
                current_place.types = current_result.types;

                // res.places[placesCtr] = current_place;
                places[placesCtr] = current_place;
                placesCtr++;
                //map.set(place_id,mapCtr++);
            }
            else if(map.hasOwnProperty(hash))
            {
              // if(place_id == map[hash])
              // {
              //   console.log(place_id + "already present in map");  
              // }
              // else
              // {
              //   console.log("hash collision, woah dude");
              // }
              
            }
          }//end of inner for
        }//end of outer for

        // for (var key in map) {
        //   if (map.hasOwnProperty(key)) {
        //     console.log(key + " -> " + map[key]);
        //   }
        // }
        //TODO fill result with relevant information. 
        //res.places = places;
        //res.send(200,res.places);
        console.log('length of places: '+places.length);
        res.json(200,places);
    }
    ], function(err) {
      if(err) return next(err);
      res.render('index', { title: 'Eat on the way' });
    });
};


// Updates an existing thing in the DB.
exports.update = function(req, res) {
  if(req.body._id) { delete req.body._id; }
  Thing.findById(req.params.id, function (err, thing) {
    if (err) { return handleError(res, err); }
    if(!thing) { return res.send(404); }
    var updated = _.merge(thing, req.body);
    updated.save(function (err) {
      if (err) { return handleError(res, err); }
      return res.json(200, thing);
    });
  });
};

// Deletes a thing from the DB.
exports.destroy = function(req, res) {
  Thing.findById(req.params.id, function (err, thing) {
    if(err) { return handleError(res, err); }
    if(!thing) { return res.send(404); }
    thing.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.send(204);
    });
  });
};

function handleError(res, err) {
  return res.send(500, err);
}