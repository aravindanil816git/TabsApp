module.exports = () => {
	var express = require('express');
	var app = express();

	// parser
	var bodyParser = require('body-parser');
	app.use(bodyParser.json());

	// Angular
	app.use('/', express.static(__dirname + "/angular/dist"));


	
	var tasks = require('./api/routes/tasks')

	app.use('/api',tasks);
		
	app.listen(3000, function () {
	  console.log('listening on port 3000...');
	});
}


	// logger


	// db
	// var db_infos = require('./db_infos');
	// var db = require('mongoose');
	'use strict';
	/*
	 const ADODB = require('node-adodb');
	*/