module.exports = function(grunt) {
  require('time-grunt')(grunt);

  var pkg = grunt.file.readJSON('package.json');
  var isPlugin = /Plugin$/.test( pkg.name );
  pkg.pubDir = 'pub/System/' + pkg.name;
  pkg.dataDir = 'data/System';
  pkg.libDirBase = 'lib/Foswiki/' + (isPlugin ? 'Plugins/': 'Contrib/');
  pkg.libDir = pkg.libDirBase + pkg.name;

  try {
    var bowerrc = grunt.file.readJSON('.bowerrc');
    pkg.bower = bowerrc.directory;
  } catch( e ) {
    pkg.bower = 'bower_components'
  }

  grunt.initConfig({
    pkg: pkg,

    sass: {
      dev: {
        options: {
          outputStyle: 'nested',
        },
        files: {
          "<%= pkg.pubDir %>/css/dndupload.css": "<%= pkg.pubDir %>/src/scss/dnd.scss"
        }
      },
      dist: {
        options: {
          outputStyle: 'compressed'
        },
        files: {
          "<%= pkg.pubDir %>/css/dndupload.min.css": "<%= pkg.pubDir %>/src/scss/dnd.scss"
        }
      }
    },

    uglify: {
      dev: {
        options: {
          beautify: true,
          compress: false,
          mangle: false,
          preserveComments: 'all'
        },
        files: {
          '<%= pkg.pubDir %>/js/dndupload.js': [
            '<%= pkg.pubDir %>/src/js/dnd.js'
          ]
        }
      },
      dist: {
        options: {
          compress: {},
          mangle: true,
          preserveComments: false
        },
        files: [{
          '<%= pkg.pubDir %>/js/dndupload.min.js': [
            '<%= pkg.pubDir %>/src/js/dnd.js'
          ],
        }]
      },
    },

    watch: {
      options: {
        interrupt: true,
      },
      grunt: {
        files: ['Gruntfile.js'],
        tasks: ['build']
      },
      sass: {
        files: ['<%= pkg.pubDir %>/src/scss/**/*.scss'],
        tasks: ['sass:dev']
      },
      uglify: {
        files: ['<%= pkg.pubDir %>/src/js/**/*.js'],
        tasks: ['uglify:dev']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-sass');

  grunt.registerTask('default', ['build', 'watch']);
  grunt.registerTask('build', ['sass','uglify']);
}
