const express = require('express'),
      requestStock = require('./models/requestStock'),
      async = require('async'),
      hbs = require('hbs'),
      socket = require('socket.io'),
      MongoClient = require('mongodb').MongoClient,
      moment = require('moment'),
      port = process.env.PORT || 3000;

var app = express();

app.set('view engine', 'hbs');

/*app.get('/data', (req, res) => {
  let stocks = ['fb', 'mmm'];
  let stockData = {};

  async.each(stocks, (el, cb) => {
    requestStock(el, data => {
      stockData[el] = data;
      cb();
    })
  }, (err) => {
    if(err)throw err;
res.send(stockData);
//let data = stockData.fb.dataset.data;
console.log(stockData.fb.dataset.data);
//res.render('index.hbs',{data: stockData.fb.dataset});
})

}); */

MongoClient.connect(`mongodb://test:testPass@ds034677.mlab.com:34677/fccstocks`, (err, db) => {
  if(err) throw err;

app.get('/', (req, res) => {
  db.collection('symbol').find({datePulled: moment().format('MM-DD-YYYY')}).toArray((err, docs) => {
    //console.log(`All docs ${JSON.stringify(docs)}`);
    res.render('index.hbs', {docs});
  })

})
let server = app.listen(port, () => {
  console.log(`Listening on port: ${port}`);
});

let io = socket(server);

io.on('connection', (socket) => {
  console.log(`Socket connection made ${socket.id}`);

  socket.on('getStock', stock => {
    console.log(stock);
    db.collection('symbol').find({symbol: stock.toUpperCase()}).toArray((err, doc) => {
      if(err) throw err;
      console.log(`Find by symbol: ${doc.length}`);

      if(doc.length > 0) {
        console.log(`Checking if data is from today`);
        db.collection('symbol').find({symbol: stock.toUpperCase(), datePulled: moment().format('MM-DD-YYYY')}).toArray((err, data) => {
          if(err) throw err;
          if(data.length){
            io.sockets.emit('getStock', data);
          } else {
            console.log(`data  not from today`);
            db.collection('symbol').deleteOne({symbol: stock.toUpperCase()});
            requestStock(stock, data => {
              console.log(data);
              db.collection('symbol').insertOne({
                datePulled: moment().format('MM-DD-YYYY'),
                symbol: data.dataset.dataset_code,
                startDate: data.dataset.start_date,
                endDate: data.dataset.end_date,
                stockData: data.dataset.data
              }, (err, record) => {
                console.log(record.ops[0]);
                io.sockets.emit('getStock', record.ops[0]);
              });

        })
        }
      }
    )} else {
      console.log(`No doc found, inserting`);
      requestStock(stock, data => {
        console.log(data);
        db.collection('symbol').insertOne({
          datePulled: moment().format('MM-DD-YYYY'),
          symbol: data.dataset.dataset_code,
          startDate: data.dataset.start_date,
          endDate: data.dataset.end_date,
          stockData: data.dataset.data
        }, (err, record) => {
          console.log(record.ops[0]);
          io.sockets.emit('getStock', record.ops[0]);
        });


  })
    }

  });
});


})
})
