const express = require('express'),
      //googleStocks = require('google-stocks'),
      Quandl = require('quandl'),
      port = process.env.PORT || 3000;

var app = express();
var quandl = new Quandl();

app.get('/', (req, res) => {

  let stocks = ['AAPL', 'FB', 'MMM'];

  let getStocks = () => {return new Promise((resolve, reject) => {
    let datasets = [];
    for(let i = 0; i < stocks.length; i++) {
      quandl.dataset({
        source: "WIKI",
        table: stocks[i]
      }, {
        order: "asc",
        exclude_column_names: true,
        // Notice the YYYY-MM-DD format
        start_date: "2017-08-03",
        //end_date: "2016-01-29",
        column_index: 4
      }, function(err, response){
        if(err)
        throw err;

        console.log("Dataset before push " + response);
        datasets.push(response);
        console.log(`Dataset inside callback after push: ${datasets}`)
      });
    }
    console.log("Datasets " + datasets);
    resolve(datasets);
  }).then(response => {
    console.log("Response: " + response)
    res.send(response);
  })
//res.send(datasets);
/*quandl.search('crude oil', {format: 'json'}, (err, response) => {
  if(err) throw err;

  console.log(response);
} ) */

      }
      getStocks();
    })
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
