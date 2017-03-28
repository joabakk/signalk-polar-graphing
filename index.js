var express = require('express')
var app = express()
var Highcharts = require('highcharts');

// Load module after Highcharts is loaded
//require('highcharts/modules/exporting')(Highcharts);
app.get(express.static('/index_.html'));

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
