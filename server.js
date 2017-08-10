const express = require('express'),
      requestStock = require('./models/requestStock'),
      async = require('async'),
      port = process.env.PORT || 3000;

var app = express();





app.get('/', (req, res) => {
  let stocks = ['fb', 'mmm', 'goog'];
  let stockData = {};

  async.each(stocks, (el, cb) => {
    requestStock(el, data => {
      stockData[el] = data;
    //  stockData.push(data);
      cb();
    })
  }, (err) => {
    if(err)throw err;
res.send(stockData);
})

});

app.listen(port, () => {
  console.log(`Listening on port: ${port}`);
});
