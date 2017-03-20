<?php
$con = mysql_connect("localhost","kplex","gammelfenix");

if (!$con) {
  die('Could not connect: ' . mysql_error());
}

mysql_select_db("polar", $con);

$result = mysql_query("SELECT `wind_dir` , MAX(  `boat_speed` ) FROM  `polar_temp` WHERE `wind_speed` >1 AND  `wind_speed` <10 GROUP BY `wind_dir`");

$rows = array();
while($r = mysql_fetch_array($result)) {
    $row[0] = $r[0];
    $row[1] = $r[1];
    array_push($rows,$row);
}

echo json_encode($rows, JSON_NUMERIC_CHECK);

mysql_close($con);
?>
