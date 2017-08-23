const express = require('express'),
	requestStock = require('./models/requestStock'),
	hbs = require('hbs'),
	socket = require('socket.io'),
	MongoClient = require('mongodb').MongoClient,
	moment = require('moment'),
	port = process.env.PORT || 3000;

var app = express();
var randomColorGen = () => Math.ceil(Math.random() * 255);

app.set('view engine', 'hbs');

MongoClient.connect(
	`mongodb://${process.env.MONGOUSER}:${process.env.MONGOPASS}@ds034677.mlab.com:34677/fccstocks`,
	(err, db) => {
		if (err) throw err;

		app.get('/', (req, res) => {
			res.render('index.hbs');
		});

		app.get('/getCurrent', (req, res) => {
			db
				.collection('symbol')
				.find(
					{ datePulled: moment().format('MM-DD-YYYY') },
					{ _id: 0, stockData: 1, symbol: 1 }
				)
				.toArray((err, docs) => {
					res.json(docs);
				});
		});
		app.get('/chartData/:timeLength', (req, res) => {
			if (req.params.timeLength === 'undefined') {
				db
					.collection('symbol')
					.find(
						{ datePulled: moment().format('MM-DD-YYYY') },
						{ _id: 0, symbol: 1, stockData: 1, color: 1 }
					)
					.toArray((err, data) => {
						if (err) throw err;

						return res.json(data);
					});
			} else {
				db.collection('symbol').aggregate([
					{ $unwind: '$stockData' },
					{
						$match: {
							datePulled: moment().format('MM-DD-YYYY'),
							stockData: {
								$gte: req.params.timeLength,
								$lte: moment().format('YYYY-MM-DD')
							}
						}
					},
					{ $project: { _id: 1, symbol: 1, stockData: 1, color: 1 } },
					{
						$group: {
							_id: '$_id',
							symbol: { $push: '$symbol' },
							color: { $push: '$color' },
							stockData: { $push: '$stockData' }
						}
					},
					{
						$project: {
							symbol: { $arrayElemAt: ['$symbol', 0] },
							stockData: 1,
							color: { $arrayElemAt: ['$color', 0] }
						}
					}
				], (err, doc) => {
					if (err) throw err;

					return res.json(doc);
				});
			}
		});

		let server = app.listen(port, () => {
			console.log(`Listening on port: ${port}`);
		});

		let io = socket(server);

		io.on('connection', socket => {
			socket.on('getStock', stock => {
				//If check our database to see if stock is currently stored
				db
					.collection('symbol')
					.find({ symbol: stock.toUpperCase() })
					.toArray((err, doc) => {
						if (err) throw err;
						//If stock is found in database, check if its from today, if so serve it, if not, remove and get fresh data
						if (doc.length > 0) {
							//Checks to see if data is from today
							db
								.collection('symbol')
								.find({
									symbol: stock.toUpperCase(),
									datePulled: moment().format('MM-DD-YYYY')
								})
								.toArray((err, data) => {
									if (err) throw err;
									if (data.length) {
										io.sockets.emit('getStock', data);
									} else {
										//Data not from today, so requests fresh data
										db
											.collection('symbol')
											.deleteOne({ symbol: stock.toUpperCase() });
										requestStock(stock, data => {
											db.collection('symbol').insertOne({
												datePulled: moment().format('MM-DD-YYYY'),
												symbol: data.dataset.dataset_code,
												startDate: data.dataset.start_date,
												endDate: data.dataset.end_date,
												stockData: data.dataset.data,
												color:
													'rgba(' +
													randomColorGen() +
													', ' +
													randomColorGen() +
													', ' +
													randomColorGen() +
													', 1.0)'
											}, (err, record) => {
												io.sockets.emit('getStock', record.ops[0]);
											});
										});
									}
								});
						} else {
							//Symbol not found, inserting to database
							requestStock(stock, data => {
								//Checks to see if symbol was found, if not, returns message to be emitted to requesting user only
								if (data.dataset === undefined) {
									io.sockets.emit('getStock', [
										'Symbol not recognized. Please try another.',
										socket.id
									]);
								} else {
									//symbol found in request, and data sent
									db.collection('symbol').insertOne({
										datePulled: moment().format('MM-DD-YYYY'),
										symbol: data.dataset.dataset_code,
										startDate: data.dataset.start_date,
										endDate: data.dataset.end_date,
										stockData: data.dataset.data,
										color:
											'rgba(' +
											randomColorGen() +
											', ' +
											randomColorGen() +
											', ' +
											randomColorGen() +
											', 1.0)'
									}, (err, record) => {
										io.sockets.emit('getStock', record.ops[0]);
									});
								}
							});
						}
					});
			});

			socket.on('deleteStock', stock => {
				//removes stock from database
				db.collection('symbol').remove({ symbol: stock });
				io.sockets.emit('deleteStock');
			});
		});
	}
);
