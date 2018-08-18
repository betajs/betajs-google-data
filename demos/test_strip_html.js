var html_strip = require('htmlstrip-native');
 
var inputChunks = [];

process.stdin.on('data', function (chunk) {
    inputChunks.push(chunk);
});

process.stdin.on('end', function () {
    var html = inputChunks.join();
        
	var options = {
	    include_script : false,
	    include_style : false,
	    compact_whitespace : true,
	    include_attributes : {}
	};
	 
	var text = html_strip.html_strip(html,options);
	 
	console.log(text);
	
});	