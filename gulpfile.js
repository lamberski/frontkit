var gulp = require('gulp');
var plugins = require('gulp-load-plugins')({ pattern: '*' });
var options = require('./options.json');
var onError = function (error) {
  plugins.util.log(plugins.util.colors.red(error.message));
  plugins.util.log(plugins.util.colors.red(error.fileName + ':' + error.lineNumber));
  plugins.util.beep();
  this.emit('end');
};
var copyToTargets = function (stream, task, directory) {
  options.targets.forEach(function (target) {
    if (target.tasks.indexOf(task) >= 0) {
      stream = stream.pipe(gulp.dest(target.path + directory));
    }
  });
  return stream;
}

gulp.task('clean', function () {
  // return plugins.del([
  //   'preview/{fonts,media,images,scripts,styles}',
  //   options.theme + '/{fonts,images,scripts,styles}'
  // ]);
});

gulp.task('templates', function () {
  var stream = gulp.src(['source/**/*.html', '!source/**/_*.html'])
    .pipe(plugins.plumber(onError))
    .pipe(plugins.twig({ errorLogToConsole: true }))
    .pipe(plugins.jsbeautifier({
      indentSize: 2,
      indentInnerHtml: true,
      unformatted: ['script'],
      maxPreserveNewlines: 1
    }));

  return copyToTargets(stream, 'templates', '/');
});

gulp.task('scripts', function () {
  var minFilter = plugins.filter('*.min.js');
  var beautifyFilter = plugins.filter(['*.js', '!*.min.js']);
  var stream = gulp.src('source/scripts/**/*.js')
    .pipe(plugins.plumber(onError))
    .pipe(plugins.include())
    .pipe(beautifyFilter)
      .pipe(plugins.jsbeautifier({ indentSize: 2, space_after_anon_function: true }))
    .pipe(beautifyFilter.restore())
    .pipe(minFilter)
      .pipe(plugins.uglify())
    .pipe(minFilter.restore());

  return copyToTargets(stream, 'scripts', '/scripts');
});

gulp.task('styles', function () {
  var minFilter = plugins.filter('*.min.{css,scss}');
  var beautifyFilter = plugins.filter(['*.{css,scss}', '!*.min.{css,scss}']);
  var stream = gulp.src('source/styles/**/*.{css,scss}')
    .pipe(plugins.plumber(onError))
    .pipe(plugins.include())
    .pipe(plugins.sass())
    .pipe(beautifyFilter)
      .pipe(plugins.jsbeautifier({ indentSize: 2 }))
      .pipe(plugins.replace(';\n/*', ';\n\n/*'))
      .pipe(plugins.replace('}\n/*', '}\n\n/*'))
      .pipe(plugins.replace('*/\n/*', '*/\n\n/*'))
      .pipe(plugins.replace('"', '\''))
    .pipe(beautifyFilter.restore())
    .pipe(plugins.autoprefixer())
    .pipe(minFilter)
      .pipe(plugins.minifyCss())
    .pipe(minFilter.restore())

  return copyToTargets(stream, 'styles', '/styles');
});

gulp.task('images', function () {
  var stream = gulp.src('source/images/**/*')
    .pipe(plugins.plumber(onError))
    .pipe(plugins.imagemin());

  return copyToTargets(stream, 'images', '/images');
});

gulp.task('fonts', function () {
  var stream = gulp.src('source/fonts/**/*')
    .pipe(plugins.plumber(onError));

  return copyToTargets(stream, 'fonts', '/fonts');
});

gulp.task('media', function () {
  var stream = gulp.src('source/media/**/*')
    .pipe(plugins.plumber(onError));

  return copyToTargets(stream, 'media', '/media');
});

gulp.task('build', function () {
  return plugins.runSequence('clean', ['templates', 'scripts', 'styles', 'images', 'fonts', 'media']);
});

gulp.task('watch', function () {
  gulp.watch('source/**/*.html', ['templates']);

  ['scripts', 'styles', 'images', 'fonts', 'media'].forEach(function (task) {
    gulp.watch('source/' + task + '/**/*', [task]);
  });
});

gulp.task('deploy', function () {
  if (options.deploy.adapter == 'ftp') {
    options.deploy.log = plugins.util.log
    var connection = plugins.vinylFtp.create(options.deploy);
    return gulp.src(options.deploy.local + '/**/*')
      .pipe(connection.newerOrDifferentSize(options.deploy.remote))
      .pipe(connection.dest(options.deploy.remote));
  } else if (options.deploy.adapter == 'rsync') {
    return gulp.src(options.deploy.root + '/**/*')
      .pipe(plugins.rsync(options.deploy));
  } else {
    plugins.util.log(plugins.util.colors.red('Deployment is not configured.'));
  }
});

gulp.task('default', function () {
  return plugins.runSequence('build', 'watch');
});
