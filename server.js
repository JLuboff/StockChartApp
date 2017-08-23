const express = require('express'),
	requestStock = require('./models/requestStock'),
	async = require('async'),
	hbs = require('hbs'),
	socket = require('socket.io'),
	MongoClient = require('mongodb').MongoClient,
	moment = require('moment'),
	port = process.env.PORT || 3000;

var app = express();
var randomColorGen = () => Math.ceil(Math.random() * 255);

app.set('view engine', 'hbs');

MongoClient.connect(
	`mongodb://test:testPass@ds034677.mlab.com:34677/fccstocks`,
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
			console.log(`Socket connection made ${socket.id}`);

			socket.on('getStock', stock => {
				console.log(stock);
				db
					.collection('symbol')
					.find({ symbol: stock.toUpperCase() })
					.toArray((err, doc) => {
						if (err) throw err;
						console.log(`Find by symbol: ${doc.length}`);

						if (doc.length > 0) {
							console.log(`Checking if data is from today`);
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
										console.log(`data  not from today`);
										db
											.collection('symbol')
											.deleteOne({ symbol: stock.toUpperCase() });
										requestStock(stock, data => {
											//  console.log(data);
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
												console.log(record.ops[0]);
												io.sockets.emit('getStock', record.ops[0]);
											});
										});
									}
								});
						} else {
							console.log(`No doc found, inserting`);
							requestStock(stock, data => {
								console.log(data);
								if (data.dataset === undefined) {
									console.log(`Symbol not found: ${socket.id}`);
									io.sockets.emit('getStock', [
										'Symbol not recognized. Please try another.',
										socket.id
									]);
								} else {
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
										//  console.log(record.ops[0]);
										io.sockets.emit('getStock', record.ops[0]);
									});
								}
							});
						}
					});
			});

			socket.on('deleteStock', stock => {
				console.log(stock);
				db.collection('symbol').remove({ symbol: stock }, (err, removed) => {
					if (err) throw err;
					db
						.collection('symbol')
						.find({ datePulled: moment().format('MM-DD-YYYY') })
						.toArray((err, doc) => {
							if (err) throw err;
							io.sockets.emit('deleteStock', doc);
						});
				});
			});
		});
	}
);
