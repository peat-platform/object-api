'use strict';

module.exports = function(grunt) {


	var tests       = 'test/**/*_test.js'
	var build_tests = 'build/instrument/' + tests
	var lib         = 'lib/**/*.js'

  // Project configuration.
  grunt.initConfig({
    nodeunit: {
      files: ['test/**/*_test.js'],
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      lib: {
        src: ['lib/**/*.js']
      },
      test: {
        src: ['test/**/*.js']
      },
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      lib: {
        files: '<%= jshint.lib.src %>',
        tasks: ['jshint:lib', 'nodeunit']
      },
      test: {
        files: '<%= jshint.test.src %>',
        tasks: ['jshint:test', 'nodeunit']
      },
    },
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-testem');
  grunt.loadNpmTasks('grunt-qunit-cov');
  grunt.loadNpmTasks('grunt-plato');
  grunt.loadNpmTasks('grunt-node-tap');
  grunt.loadNpmTasks('grunt-istanbul');
  grunt.loadNpmTasks('grunt-istanbul-coverage');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-config');

  // Default task(s).

  grunt.registerTask('test',     ['nodeunit']);
  grunt.registerTask('cover',    ['clean:build', 'instrument', 'reloadTasks', 'nodeunit', 'storeCoverage', 'makeReport']);
  grunt.registerTask('default',  ['required',    'jshint',     'nodeunit' ]);
  grunt.registerTask('jenkins',  ['jshint',      'cover',      'coverage',    'plato']);


};
