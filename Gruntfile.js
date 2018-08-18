module.exports = function(grunt) {

	var pkg = grunt.file.readJSON('package.json');
	var gruntHelper = require('betajs-compile');

	var dist = "betajs-google-data";

	gruntHelper.init(pkg, grunt)

    /* Compilation */    
	.scopedclosurerevisionTask("scoped", "src/*/*.js", "dist/" + dist + "-noscoped.js", {
		"module": "global:BetaJS.Data.Google",
		"base": "global:BetaJS",
		"data": "global:BetaJS.Data"
    }, {
    	"base:version": pkg.devDependencies.betajs,
    	"data:version": pkg.devDependencies["betajs-data"]
    })
	.concatTask('concat-scoped', [require.resolve('betajs-scoped'), 'dist/' + dist + '-noscoped.js'], 'dist/' + dist + '.js')
	.uglifyTask('uglify-noscoped', 'dist/' + dist + '-noscoped.js', 'dist/' + dist + '-noscoped.min.js')
	.uglifyTask('uglify-scoped', 'dist/' + dist + '.js', 'dist/' + dist + '.min.js')
    .packageTask()
	.jsbeautifyTask("beautify1", "src/**/*.js")

    /* Testing */
	.qunitjsTask(null, 'tests/qunitjs-node.js')
    .lintTask(null, ['./src/**/*.js', 'dist/betajs-google-data.js', './Gruntfile.js', './tests/**/*.js'])
    
    /* Markdown Files */
	.readmeTask()
	.autoincreasepackageTask(null, "package-source.json")
    .licenseTask();

	grunt.initConfig(gruntHelper.config);	

	grunt.registerTask('default', ["autoincreasepackage", 'package', 'readme', 'license', 'beautify1', 'scoped', 'concat-scoped', 'uglify-noscoped', "uglify-scoped", 'lint']);
	grunt.registerTask('check', [ 'lint', 'qunitjs' ]);

};
