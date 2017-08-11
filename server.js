const express = require('express'),
      requestStock = require('./models/requestStock'),
      async = require('async'),
      hbs = require('hbs'),
      socket = require('socket.io'),
      port = process.env.PORT || 3000;

var app = express();

app.set('view engine', 'hbs');

/*app.get('/', (req, res) => {
  let stocks = ['fb'];
  let stockData = {};

  async.each(stocks, (el, cb) => {
    requestStock(el, data => {
      stockData[el] = data;
      cb();
    })
  }, (err) => {
    if(err)throw err;
//res.send(stockData);
//let data = stockData.fb.dataset.data;
console.log(stockData.fb.dataset.data);
res.render('index.hbs',{data: stockData.fb.dataset});
})

}); */

app.get('/', (req, res) => {
  res.render('index.hbs');
})
let server = app.listen(port, () => {
  console.log(`Listening on port: ${port}`);
});

let io = socket(server);

io.on('connection', (socket) => {
  console.log(`Socket connection made ${socket.id}`);

  socket.on('getStock', stock => {
    console.log(stock);
    requestStock(stock, data => {
    io.sockets.emit('getStock', data);
  });
});


})
