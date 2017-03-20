var express   =    require("express");
var mysql     =    require('mysql');
var app       =    express();

var pool      =    mysql.createPool({
    connectionLimit : 10, //important
    host     : '127.0.0.1',
	port	 : 3306,
    user     : 'polar',
    password : 'polar',
    database : 'polar',
    debug    : false,
	acquireTimeout : 30000
});

app.use(express.static('public'));

function handle_database(req,res) {

    pool.getConnection(function(err,connection){
        if (err) {
          console.log(err);
		  res.json({"code" : 100, "status" : "Error in connection database"});
          return;
        }

        console.log('connected as id ' + connection.threadId);

		connection.query('SELECT * from opc.variables order by timestamp', function(err, rows, fields) {
            connection.release();
            if(!err) {
                res.json(rows);
            }
        });

        connection.on('error', function(err) {
              res.json({"code" : 100, "status" : "Error in connection database"});
              return;
        });
  });
}

app.get("/service1",function(req,res){
        handle_database(req,res);
});
