'use strict';

angular.module('eatontheway3App')
  .controller('MainCtrl', function ($scope, $http, socket) {
    //$scope.awesomeThings = [];

    $http.get('/api/things').success(function(defaultMarker) {
      //$scope.awesomeThings = awesomeThings;
      //initialize the map
      
      var defaultPosition = new google.maps.LatLng(40.0000, -98.0000);
      var mapOptions = {
      zoom: 4,
      center: defaultPosition,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

      var map = new google.maps.Map(document.getElementById('map_canvas'), mapOptions);
      //map = new google.maps.Map($scope.map_canvas_angular, mapOptions);
      //put a default marker on the map

    //   $scope.map = map;

      socket.syncUpdates('thing', $scope.awesomeThings);
    });

    // $scope.map_canvas_angular = function() {
    //   alert('dummy');
    //   var defaultPosition = new google.maps.LatLng(-34.397, 150.644);
    //   var mapOptions = {
    //   zoom: 8,
    //   center: defaultPosition,
    //   mapTypeId: google.maps.MapTypeId.ROADMAP
    // };
    //   map = new google.maps.Map($scope.map_canvas_angular, mapOptions);      
    // }

    $scope.submit = function() {
      if($scope.from_text == '' || $scope.to_text == '') {
        return;
      }
      alert("from: "+$scope.from_text + " to: "+$scope.to_text);
      var locations = new Object();
      locations['from'] = $scope.from_text;
      locations['to'] = $scope.to_text;

      $http.post('/api/things', { locations:locations }).success(function(res) {
        //alert('dummy alert');
        //alert('res: '+res);
        $scope.markers = [];
        var infoWindow = new google.maps.InfoWindow();
        var defaultPosition = new google.maps.LatLng(40.0000, -98.0000);
        var mapOptions = {
          zoom: 4,
          center: defaultPosition,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        var map = new google.maps.Map(document.getElementById('map_canvas'), mapOptions);
        var createMarker = function (info){
        
          var marker = new google.maps.Marker({
              map: map,
              position: new google.maps.LatLng(info.geometry.location.lat, info.geometry.location.lng),
              title: info.name
          });
          marker.content = '<div class="infoWindowContent">' + info.desc + '</div>';
          
          google.maps.event.addListener(marker, 'click', function(){
              infoWindow.setContent('<h2>' + marker.title + '</h2>' + marker.content);
              infoWindow.open(map, marker);
          });
          
          $scope.markers.push(marker);
        
        } 
        var i = 0;
        for(i = 0; i < res.length; i++)
        {
          createMarker(res[i]);
        }

        alert('locations: '+locations);
        alert('res.places: '+res);

        //$scope.places = res;

      });
      $scope.from_text = '';
      $scope.to_text = '';
    }

    $scope.addThing = function() {
      if($scope.newThing === '') {
        return;
      }
      $http.post('/api/things', { name: $scope.newThing });
      $scope.newThing = '';
    };

    $scope.deleteThing = function(thing) {
      $http.delete('/api/things/' + thing._id);
    };

    $scope.$on('$destroy', function () {
      socket.unsyncUpdates('thing');
    });

    $scope.openInfoWindow = function(e, selectedMarker){
      e.preventDefault();
      google.maps.event.trigger(selectedMarker, 'click');
    }
  });
