function extractEmailSnippet(body) {
	var REGEX = [
	    /^([\s\S]*?)[\s\r\n]*.*@.*[\s\r\n]*>[\s\S]*$/g
    ];
	
	for (var i = 0; i < REGEX.length; ++i) {
		var match = REGEX[i].exec(body);
		if (match)
			return match[1];
	}
	
	return body;
}

var inputChunks = [];

process.stdin.on('data', function (chunk) {
    inputChunks.push(chunk);
});

process.stdin.on('end', function () {
    var text = inputChunks.join();
    
    console.log(extractEmailSnippet(text));
        
});	