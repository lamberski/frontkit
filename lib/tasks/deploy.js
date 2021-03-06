module.exports = function (gulp, plugins, config, helpers) {
  gulp.task('deploy', function () {
    var args = plugins.yargs.argv
    var targets = config.deploy

    if (targets[args.target] !== undefined) {
      if (targets[args.target]) {
        var target = targets[args.target]
        targets = {}
        targets[args.target] = target
      } else {
        targets = {}
        plugins.util.log(plugins.util.colors.red('Deployment target "' + args.target + '" is not defined.'))
      }
    }

    Object.keys(targets).forEach(function(key) {
      var target = targets[key]
      if (target.adapter == 'ftp') {
        target.log = plugins.util.log
        var connection = plugins.vinylFtp.create(target)
        return gulp.src(target.files, {dot: true})
          .pipe(connection.differentSize(target.destination))
          .pipe(connection.dest(target.destination))
      } else if (target.adapter == 'scp2') {
        return gulp.src(target.files, {dot: true})
          .pipe(plugins.scp2(target))
      } else if (target.adapter == 'slim') {
        return plugins.rsyncSlim(target)
      } else {
        plugins.util.log(plugins.util.colors.red('Deployment target "' + key + '" is not configured.'))
      }
    })
  })
}
