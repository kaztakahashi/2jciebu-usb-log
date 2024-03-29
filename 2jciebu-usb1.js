'use strict';

const serialport = require('serialport')
const os = require('os');

const comPort = '/dev/ttyUSB0';
var id;
//id='00112233aabb';
var allowDuplicates = false;
var filetype = 'json';

for (var i=0; i < process.argv.length; i++) {
  if (process.argv[i].toLowerCase() === '-h' ) {
	  console.log ('node ' + process.argv[1] + ' [-h] [-p] [csv]');
	  console.log ('   -h   show this message');
	  console.log ('   -p   continous scan \( The script outputs one line and exits without -p option. \)');
	  console.log ('   csv  output in csv format \( output in json format without csv option \)');
	  return;
  } else if ( process.argv[i].toLowerCase().search(/^(\d|[a-f]){12}$/) !== -1 ) {
	  macaddr.push(process.argv[i].toLowerCase());
  } else if (process.argv[i].toLowerCase() === '-p' ) {
	  allowDuplicates = true;
  } else if (process.argv[i].toLowerCase() === 'csv' ) {
	  filetype = 'csv';
  }
}

const port = new serialport(comPort, {
  baudRate: 115200,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  flowControl: false,
  encoding: 'hex'
},function(err) {
  if (err) {
    return console.log('Error: ', err.message)
  }
})

var interval1;
function open() {
	port.open(function(err2){
		if (!err2) {
			return;
		} else {
		//console.log('Port is not open: ' + err2.message);
		setTimeout(open, 10000);
		}
	});
}

var writebytes = new Buffer([0x52,0x42,0x05,0x00,0x01,0x22,0x50,0xE2,0xBB],'hex');

if ( filetype === 'csv' ) {
  if ( id ) {
    var header = 'created, hostname, id, temperature, humidity, light, pressure, noise, etvoc, eco2' ; 
  } else {
    var header = 'created, hostname, temperature, humidity, light, pressure, noise, etvoc, eco2' ; 
  }
  console.log ( header ) ;
}

port.on('open', function() {
	clearInterval(interval1);
	function send() {
        	port.write(writebytes, function (err3) {
      		if (err3)
            port.drain();
        });
    }
    interval1 = setInterval(send, 1000);
});

port.on('close', function () {
	clearInterval(interval1);
	//console.log('CLOSE');
	open(); // reopen 
});

var data1;
port.on('data', function (data) {
	//console.log('Data:', data)
      var regex = new RegExp(/^5242/);
      var data0 = data.toString('hex');
      var result1;
      if (regex.test(data0) && data0.length === 60) {
        result1 = data0;
      } else if ( regex.test(data0) ) {
        data1 = data0;
      } else if ( (data1 + data0).length === 60 ) {
        result1 = data1 + data0;
        data1;
      }

      if ( result1 && result1.length === 60 ) {
        var result2 = result1.match(/^5242[a-z0-9]{12}([a-z0-9]{2})([a-z0-9]{2})([a-z0-9]{2})([a-z0-9]{2})([a-z0-9]{2})([a-z0-9]{2})([a-z0-9]{2})([a-z0-9]{2})([a-z0-9]{2})([a-z0-9]{2})([a-z0-9]{2})([a-z0-9]{2})([a-z0-9]{2})([a-z0-9]{2})([a-z0-9]{2})([a-z0-9]{2})[a-z0-9]+$/);
        //var now = new Date();
        var now = new Date();
        if ( filetype === 'csv' ) {
          now = now.toLocaleString('ja-JP','long' );
        }

        var envData = {
          created: now,
          hostname: os.hostname(),
          id: id,
          temperature: parseInt(result2[2]+result2[1],16)/100,
          humidity: parseInt(result2[4]+result2[3],16)/100,
          light: parseInt(result2[6]+result2[5],16),
          pressure: parseInt(result2[10]+result2[9]+result2[8]+result2[7],16)/1000,
          noise: parseInt(result2[12]+result2[11],16)/100,
          etvoc: parseInt(result2[14]+result2[13],16),
          eco2: parseInt(result2[16]+result2[15],16)
        };

        var result;
		if ( filetype === 'csv' ) {
                  for ( var key in envData ) {
                    if ( result === undefined ) {
                      result = envData[key] ;
                    } else if ( envData[key] ) {
                      result += ',' + envData[key] ;
                    }
		  }
                } else {
		    result = JSON.stringify( envData );
		}
                console.log ( result ) ;

		if ( allowDuplicates !== true ) { process.exit(); }
      }
})

const lineStream = port.pipe(new serialport.parsers.Readline())

open(); // open manually


