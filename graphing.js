var tableIndexMax = 2 //should start as 2, port, starboard and combined already hard-coded
const tableData = {}
var vesselName

function getVesselName(){
  (async() => {
    try {
      var response = await fetch("/signalk/v1/api/vessels/self/name");
      vesselName = await response.json();
      return vesselName
    } catch (e) {
      console.log("Error fetching boat name")
    }
  })()
  return vesselName
}

function getTables(err, response){ // get user entered polars

  $.getJSON("/plugins/signalk-polar/listPolarTables", function(json) {
    json.forEach(function(table) {
      if(table.name!='polar'){// only show user entered values this way
        tableIndexMax ++
        $.getJSON("/plugins/signalk-polar/listWindSpeeds?table=" + table.name, function (windSpeeds) {
          windSpeeds.forEach(function nameTables(windSpeed){
            var tableName = table.name + "_" + windSpeed.windSpeed
            //tableData.push(tableName) //
            const polarArray = [];
            tableData[tableName]= polarArray;
            //console.log("tableData: " + tableData)
            $.getJSON("/plugins/signalk-polar/polarTable/?windspeed=" + (windSpeed.windSpeed + 0.01) + "&interval=0.1&table=" + table.name, function (combination) {
              combination.forEach(function(entry){
                var windDeg = Math.abs(entry['angle']/Math.PI*180);
                var speedKnots = entry['speed']/1852*3600;
                var item = [windDeg, speedKnots]
                polarArray.push(item)
              })
            })
          })
        });
      }
    });
    //console.log("response max index: " + tableIndexMax) //ok here


  });

  if(err){
    console.log("error: " + err)
  } else {

    return tableData
  }

}

//to be updated once every second?:
var current = [];
//updated only on refresh:
var portPolar = [];
var stbPolar = [];
var polarCombined = [];

var tackAngle
var reachAngle

var windSpeed = 5.8;
var windRange = 0.2;

var nightmode = false;

function getWind() {
  (async() => {
    try {
      var response = await fetch("/signalk/v1/api/vessels/self/environment/wind/speedTrue/value");
      windSpeed = await response.json();
      //console.log("wind speed: " + windSpeed)
    } catch (e) {
      console.log("Error fetching wind speed")
    }
  })()
  return windSpeed;
};


$(function () {

  Highcharts.setOptions({
    global : {
      useUTC : false
    }
  });

  $('#container').highcharts({

    chart: {
      animation: false,//to remove flickering on axis labels
      //borderWidth: 2,
      marginLeft: 50,
      //marginTop: 100,
      polar: true,
      events: {
        load: function () {
          var chart = $('#container').highcharts();
          var plotLine = this.xAxis.plotLines;

          // Get user defined tables from signalk-polar API
          var userTables = getTables()
          vesselName = getVesselName()
          setTimeout(function () {
            chart.setTitle({
              align: 'left',
              text: vesselName + ' live polar chart'
            });

            console.log("max index: " + tableIndexMax)
            console.log("tableData: " + JSON.stringify(userTables, null, 4));
            var iter = 2
            Object.keys(userTables).forEach(function(key) {
              chart.addSeries({
                type: 'line',
                name: key.replace(/_/g, " ") + ' m/s',
                dashStyle: 'shortdashdot',
                data: userTables[key],
                visible: true,
                connectEnds: false
              })
            })
          }, 500)

          // set up the updating of the plotlines each second
          setInterval(function () {

            chart = $('#container').highcharts();
            (async() => {
              try {
                var response = await fetch("/signalk/v1/api/vessels/self/performance/beatAngle/value");
                var x = await response.json();
                tackAngle = Math.abs(x/Math.PI*180);

                response = await fetch("/signalk/v1/api/vessels/self/performance/gybeAngle/value");
                var y = await response.json();
                reachAngle = Math.abs(y/Math.PI*180);

              } catch (e) {
                console.log("Error fetching beat and gybe angles")
              }

              chart.xAxis[0].removePlotLine('tack');
              chart.xAxis[0].removePlotLine('reach');
              chart.xAxis[0].addPlotLine({
                color: 'red', // Color value
                dashStyle: 'shortdashdot', // Style of the plot line. Default to solid
                value: tackAngle,//getTarget().Tack, // Value of where the line will appear
                width: 2, // Width of the line
                id: 'tack',
                label: {
                  text: 'Target tack '+tackAngle.toFixed(2)+ '°',
                  verticalAlign: 'center',
                  textAlign: 'right',
                  rotation: 90,//rotation: tackAngle-90,
                  //y: 12,
                  x: 0//120
                }
              });
              chart.xAxis[0].addPlotLine({
                color: 'red', // Color value
                dashStyle: 'shortdashdot', // Style of the plot line. Default to solid
                value: reachAngle,//getTarget().Tack, // Value of where the line will appear
                width: 2, // Width of the line
                id: 'reach',
                label: {
                  text: 'Target reach '+reachAngle.toFixed(2)+ '°',
                  verticalAlign: 'right',
                  textAlign: 'top',
                  rotation: 90,//rotation: reachAngle-90,
                  //y: 12,
                  x: 0//20
                }
              });
            })();
          }, 1000);

          // set up the updating of the chart each second

          var series = this.series[tableIndexMax + 1];
          var seriess = this.series;

          setInterval(function () {
            var subTitle = getWind().toFixed(2)+' +/-'+windRange+' m/s';
            //alert(subTitle);
            chart.setTitle(null, {text: subTitle});

            (async() => {
              try {
                var response = await fetch("/signalk/v1/api/vessels/self/environment/wind/angleTrueWater/value");
                var x = await response.json();
                var xDegAbs = Math.abs(x/Math.PI*180);
                response = await fetch("/signalk/v1/api/vessels/self/navigation/speedThroughWater/value");
                var y = await response.json();
                var yKnots = y/1852*3600;
                //console.log(xDegAbs + " " + yKnots);
                series.addPoint([xDegAbs, yKnots], true, true);

              } catch (e) {
                console.log("Error fetching wind angle and boat speed")
              }
            })();


          }, 1000);

          //update current polar each second
          setInterval(function () {
            var chart = $('#container').highcharts(),
            options = chart.options;
            $.getJSON("/plugins/signalk-polar/polarTable/?windspeed=" + windSpeed + "&interval=" + windRange, function (json) {
              portPolar.length = 0;
              stbPolar.length = 0;
              polarCombined.length = 0;
              json.forEach(function(entry) {
                if(entry['angle'] > 0){
                  var windDeg = (entry['angle']/Math.PI*180);
                  var speedKnots = entry['speed']/1852*3600;
                  //console.log(windDeg + ',' + speedKnots);
                  var polarItem = [windDeg , speedKnots];
                  stbPolar.push(polarItem); //positive angles
                }

                if(entry['angle'] < 0){
                  var windDeg = (entry['angle']/Math.PI*180);
                  var speedKnots = entry['speed']/1852*3600;
                  //console.log(windDeg + ',' + speedKnots);
                  var polarItem = [-windDeg , speedKnots];
                  portPolar.push(polarItem); //negative angles
                }

                var windDeg = Math.abs(entry['angle']/Math.PI*180);
                var speedKnots = entry['speed']/1852*3600;
                var polarItem = [windDeg , speedKnots];
                polarCombined.push(polarItem); //combined port and starboard angles

              });
              chart.series[0].setData(portPolar,true);
              chart.series[1].setData(stbPolar,true);
              chart.series[2].setData(polarCombined,true);

              options = chart.options;
            });

          }, 1000);



        }
      }



    },

    legend: {
      verticalAlign: "middle",
      layout: "vertical"
    },

    pane: {
      center: ["0%", "50%"],
      startAngle: 0,
      endAngle: 180
    },

    xAxis: {
      tickInterval: 45,
      min: 0,
      max: 180,
      labels: {
        formatter: function () {
          return this.value + '°';
        }
      },
      plotLines: [{
        color: 'red', // Color value
        dashStyle: 'shortdashdot', // Style of the plot line. Default to solid
        value: tackAngle,//getTarget().Tack, // Value of where the line will appear
        width: 2, // Width of the line
        id: 'tack',
        label: {
          text: 'Target tack '+tackAngle+ '°',
          verticalAlign: 'center',
          textAlign: 'center',
          rotation: tackAngle-90,
          x: 90
        }
      },  {
        color: 'red', // Color value
        dashStyle: 'shortdashdot', // Style of the plot line. Default to solid
        value: reachAngle, // Value of where the line will appear
        width: 2, // Width of the line
        id: 'reach', //see http://www.highcharts.com/docs/chart-concepts/plot-bands-and-plot-lines for dynamically updating
        label: {
          text: 'Target reach '+reachAngle+ '°',
          verticalAlign: 'right',
          textAlign: 'top',
          rotation: reachAngle-90,
          x: 20
        }
      }]
    },

    yAxis: {
      min: 0
    },

    plotOptions: {
      series: {
        pointStart: 0,
        pointInterval: 45,
        enableMouseTracking: false

      },
      column: {
        pointPadding: 0,
        groupPadding: 0
      },
      spline: { /* or line, area, series, areaspline etc.*/
        marker: {
          enabled: false
        },
        connectNulls: false
      },
      scatter: {
        dataLabels: {
          enabled: true,
          format: '{y:.2f}kn , {x:.1f}°'
        },
        marker: {
          //fillColor: 'transparent',
          lineWidth: 2,
          symbol: 'circle',
          lineColor: null
        }
      }
    },
    series: [{
      type: 'line',
      name: 'Port',
      color: 'red',
      data: portPolar,
      visible: false,
      connectEnds: false,
      turboThreshold: 0
    }, {
      type: 'line',
      name: 'Starboard',
      color: 'green',
      data: stbPolar,
      visible: false,
      connectEnds: false,
      turboThreshold: 0
    },{
      type: 'line',
      name: 'Combined port & stbd',
      lineWidth: 5,
      //color: 'blue',
      data: polarCombined,
      connectEnds: false,
      turboThreshold: 0
    },{
      type: 'scatter',
      name: 'Current performance',
      color: 'orange',
      data: [current],
    }]


  });

  $('#toggle').click(function () {
    var chart = $('#container').highcharts(),
    options = chart.options;

    options.chart.polar = !options.chart.polar;

    $('#container').highcharts(options);
  });

});
