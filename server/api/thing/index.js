'use strict';

var express = require('express');
var controller = require('./thing.controller');

var router = express.Router();

router.get('/', controller.index);
router.get('/:id', controller.show);
//router.post('/', controller.create);
//router.post('/', controller.returnPlaces);
router.post('/', controller.getDirections,controller.getPlaces);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.destroy);

module.exports = router;