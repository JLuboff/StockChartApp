const querystring = require('querystring'),
	https = require('https'),
	moment = require('moment');

const requestStock = function(stock, callback) {
  console.log(stock);
	const apiQuery = querystring.stringify({
		start_date: moment().subtract(1, 'y').format('YYYY-MM-DD'),
		end_date: moment().subtract(1, 'd').format('YYYY-MM-DD'),
		column_index: 4
	});

	const options = {
		hostname: 'www.quandl.com',
		port: 443,
		path: '/api/v3/datasets/WIKI/' + stock + '.json?' + apiQuery,
		method: 'GET'
	};

	https.get(options, res => {
		let data = '';
		res.setEncoding('utf8');

		res.on('data', chunk => {
			data += chunk;
		});

		res.on('end', () => {
			return callback(JSON.parse(data));
		});
	});
};

module.exports = requestStock;
