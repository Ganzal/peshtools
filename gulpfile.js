/**
 * Полезные инструменты для сайта Peshkariki.ru.
 * 
 * @author Sergey D. Ivanov <me@ganzal.pro>
 * @copyright Copyright (c) 2016, Sergey D. Ivanov <me@ganzal.pro>
 *                      (c) 2016, PeshTools Project https://peshtools.ganzal.com/
 *                      
 * @package peshtools
 * @license MIT
 */

/**
 * Задачи GULP.
 * 
 * @since   0.1.0   2016-12-16
 * @version 0.1.0   2017-01-10
 * @date    2017-01-10
 */

/*******************************************************************************
 * 
 * Модули GULP
 * 
 ******************************************************************************/
var gulp = require('gulp');
var cleanCSS = require('gulp-clean-css');
var clean = require('gulp-rimraf');
var del = require('del');
var exec = require('child_process').execSync;
var fs = require('fs');
var htmlmin = require('gulp-htmlmin');
var jsonmin = require('gulp-jsonmin');
var jsonTransform = require('gulp-json-transform');
var merge = require('merge-stream');
var runSequence = require('run-sequence');
var stripDebug = require('gulp-strip-debug');
var uglify = require('gulp-uglify');
var vfs = require('vinyl-fs');
var zip = require('gulp-zip');


/*******************************************************************************
 * 
 * Задачи GULP
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 
 * Рутины сборки.
 * 
 ******************************************************************************/

/**
 * build
 * 
 * Сборка тестового релиза.
 */
gulp.task('build', function (cb) {
    return runSequence(
            'clean:build:common',
            'build:common',
            ['build:chrome', 'build:firefox'],
            cb);
});


/**
 * build:common
 * build:common:html
 * build:common:css
 * build:common:img
 * build:common:js
 * 
 * Сборка общей части пакета. 
 */
gulp.task('build:common', function (cb) {
    return runSequence(
            [
                'build:common:html',
                'build:common:css',
                'build:common:img',
                'build:common:js'
            ],
            cb);
});

gulp.task('build:common:html', function () {
    console.log("Minifing HTML sources");
    return gulp.src('src/common/html/*.html')
            .pipe(htmlmin({collapseWhitespace: true}))
            .pipe(gulp.dest('build/common/html'));
});

gulp.task('build:common:css', function () {
    console.log("Minifing CSS sources");
    return gulp.src('src/common/css/*.css')
            .pipe(cleanCSS())
            .pipe(gulp.dest('build/common/css'));
});

gulp.task('build:common:img', function () {
    console.log("Copying images");
    return gulp.src('src/common/img/*')
            .pipe(gulp.dest('build/common/img'));
});

gulp.task('build:common:js', function () {
    console.log("Minifing JS sources");
    return gulp.src('src/common/js/*.js')
            .pipe(uglify())
            .pipe(gulp.dest('build/common/js'));
});


/**
 * build:chrome
 * build:chrome:copy:common
 * build:chrome:copy:custom
 * 
 * Тестовая сборка для Google Chrome.
 */
gulp.task('build:chrome', function (cb) {
    return runSequence(
            'clean:build:chrome',
            'build:chrome:copy:common',
            'build:chrome:copy:custom',
            cb);
});

gulp.task('build:chrome:copy:common', function () {
    return gulp.src('build/common/**')
            .pipe(gulp.dest('build/chrome'));
});

gulp.task('build:chrome:copy:custom', function () {
    var v = GetPackageVersion();
    var b = GetBuildID('chrome', true);

    return gulp.src('src/chrome/manifest.json')
            .pipe(jsonTransform(function (data, file)
            {
                data.version = ComposeFullVersion(v.version, b);

                if (v.version_name)
                {
                    data.version_name = v.version_name + ', build ' + b;
                } else
                {
                    delete data.version_name;
                }

                return data;
            }))
            .pipe(jsonmin())
            .pipe(gulp.dest('build/chrome'));
});


/**
 * build:firefox
 * build:firefox:copy:common
 * build:firefox:copy:custom
 * 
 * Тестовая сборка для Mozilla Firefox.
 */
gulp.task('build:firefox', function (cb) {
    return runSequence(
            'clean:build:firefox',
            'build:firefox:copy:common',
            'build:firefox:copy:custom',
            cb);
});

gulp.task('build:firefox:copy:common', function () {
    return gulp.src('build/common/**')
            .pipe(gulp.dest('build/firefox'));
});

gulp.task('build:firefox:copy:custom', function () {
    var v = GetPackageVersion();
    var b = GetBuildID('firefox', true);

    return gulp.src('src/firefox/manifest.json')
            .pipe(jsonTransform(function (data, file)
            {
                data.version = ComposeFullVersion(v.version, b);

                if (v.version_name)
                {
                    data.version_name = v.version_name + ', build ' + b;
                } else
                {
                    delete data.version_name;
                }

                return data;
            }))
            .pipe(jsonmin())
            .pipe(gulp.dest('build/firefox'));
});



/*******************************************************************************
 * 
 * Рутины очистки.
 * 
 ******************************************************************************/

/**
 * clean
 * 
 * Очистка каталогов сборки.
 */
gulp.task('clean', [
    'clean:build',
    'clean:dist'
]);


/**
 * clean:all
 * 
 * Удаление каталогов сборки и отладки.
 */
gulp.task('clean:all', [
    'clean:build',
    'clean:dist',
    'clean:live'
]);


/**
 * clean:build
 * clean:build:common
 * clean:build:chrome
 * clean:build:firefox
 * 
 * Очистка каталогов сборки тестового релиза.
 */
gulp.task('clean:build', function () {
    console.log("Cleaning 'build' folder");
    return del.sync([
        'build/*'
    ]);
});

gulp.task('clean:build:common', function () {
    console.log("Cleaning 'build/common' folder");
    return del.sync([
        'build/*'
    ]);
});

gulp.task('clean:build:chrome', function () {
    console.log("Cleaning 'build/chrome' folder");
    return gulp.src("build/chrome/*", {read: false})
            .pipe(clean());
});

gulp.task('clean:build:firefox', function () {
    console.log("Cleaning 'build/firefox' folder");
    return gulp.src("build/firefox/*", {read: false})
            .pipe(clean());
});


/**
 * clean:dist
 * clean:dist:chrome
 * clean:dist:firefox
 * 
 * Очистка каталога сборки публичного релиза.
 */
gulp.task('clean:dist', function () {
    console.log("Cleaning 'dist' folder");
    return del.sync([
        'dist/*',
        '!dist/release'
    ]);
});

gulp.task('clean:dist:chrome', function () {
    console.log("Cleaning 'dist/chrome' folder");
    return gulp.src("dist/chrome/*", {read: false})
            .pipe(clean());
});

gulp.task('clean:dist:firefox', function () {
    console.log("Cleaning 'dist/firefox' folder");
    return gulp.src("dist/firefox/*", {read: false})
            .pipe(clean());
});


/**
 * clean:live
 * 
 * Очистка LIVE-каталогов.
 */
gulp.task('clean:live', function () {
    console.log("Cleaning 'live' folder");
    return del.sync([
        'live/*'
    ]);
});



/*******************************************************************************
 * 
 * Рутины инициализации процесса разработки и тестирования.
 * 
 ******************************************************************************/

/**
 * live
 * live:init
 * 
 * Инициализация LIVE-каталогов для отладки в процессе разработки.
 */
gulp.task('live', ['live:init']);

gulp.task('live:init', [
    'live:init:chrome',
    'live:init:firefox'
]);


/**
 * live:clean
 * live:clean:chrome
 * leve:clean:firefox
 * 
 * Очистка LIVE-каталогов.
 */
gulp.task('live:clean', ['clean:live']);

gulp.task('live:clean:chrome', function () {
    console.log("Cleaning 'live/chrome' folder");
    return gulp.src("live/chrome/*", {read: false})
            .pipe(clean());
});

gulp.task('live:clean:firefox', function () {
    console.log("Cleaning 'live/firefox' folder");
    return gulp.src("live/firefox/*", {read: false})
            .pipe(clean());
});


/**
 * live:init:chrome
 * 
 * Инициализация LIVE-каталога для Google Chrome и других браузеров на движке Chromium.
 */
gulp.task('live:init:chrome', ['live:clean:chrome'], function () {
    try {
        console.log("Symlinking Chrome-compatible manifest.json");
        var s1 = gulp.src('src/chrome/manifest.json')
                .pipe(vfs.symlink('live/chrome'));

        console.log("Symlinking common sources");
        var s2 = gulp.src('src/common/*')
                .pipe(vfs.symlink('live/chrome'));

        return merge(s1, s2);

    } catch (err) {
        console.error(err);
        throw err;
    }
});


/**
 * live:init:chrome
 * 
 * Инициализация LIVE-каталога для Mozilla Firefox.
 */
gulp.task('live:init:firefox', ['live:clean:firefox'], function () {
    try {
        console.log("Symlinking Firefox-compatible manifest.json");
        var s1 = gulp.src('src/firefox/manifest.json')
                .pipe(vfs.symlink('live/firefox'));

        console.log("Symlinking common sources");
        var s2 = gulp.src('src/common/*')
                .pipe(vfs.symlink('live/firefox'));

        return merge(s1, s2);

    } catch (err) {
        console.error(err);
        throw err;
    }
});



/*******************************************************************************
 * 
 * Рутины сборки релиза.
 * 
 ******************************************************************************/

/**
 * dist
 * 
 * Сборка релиза.
 */
gulp.task('dist', [
    'dist:chrome',
    'dist:firefox'
]);

gulp.task('dist:prepare', function () {
    var c = [
        'mkdir -p var/tmp/web-ext',
        'mkdir -p dist/release'
    ];

    exec(c.join(' && '), {stdio: 'inherit'});
});


/**
 * dist:chrome
 * dist:chrome:copy
 * dist:chrome:compress
 * 
 * Сборка релиза для Google Chrome.
 */
gulp.task('dist:chrome', function () {
    return runSequence(
            'dist:prepare',
            'clean:dist:chrome',
            'dist:chrome:copy',
            'dist:chrome:compress'
            );
});

gulp.task('dist:chrome:copy', function () {
    var s1 = gulp.src([
        'build/chrome/**',
        '!build/chrome/js/**',
        '!build/chrome/manifest\.json'
    ]).pipe(gulp.dest('dist/chrome'));

    var s2 = gulp.src('build/chrome/manifest.json')
            .pipe(jsonTransform(function (data, file)
            {
                data.name = data.name.replace(/-Dev$/, '');
                return data;
            }))
            .pipe(jsonmin())
            .pipe(gulp.dest('dist/chrome'));

    var s3 = gulp.src('build/chrome/js/*.js')
            .pipe(stripDebug())
            .pipe(gulp.dest('dist/chrome/js'));

    return merge(s1, s2, s3);
});

gulp.task('dist:chrome:compress', function () {
    var v = JSON.parse(fs.readFileSync('dist/chrome/manifest.json')).version;

    try {
        return gulp.src('dist/chrome/**')
                .pipe(zip('peshtools-chrome-' + v + '.zip'))
                .pipe(gulp.dest('dist/release'));
    } catch (e)
    {
        console.error(e);

        throw e;
    }
});


/**
 * dist:firefox
 * dist:firefox:copy
 * dist:firefox:compress
 * 
 * Сборка релиза для Mozilla Firefox.
 */
gulp.task('dist:firefox', function () {
    return runSequence(
            'dist:prepare',
            'clean:dist:firefox',
            'dist:firefox:copy',
            'dist:firefox:compress'
            );
});

gulp.task('dist:firefox:copy', function () {
    var s1 = gulp.src([
        'build/firefox/**',
        '!build/firefox/js/**',
        '!build/firefox/manifest\.json'
    ]).pipe(gulp.dest('dist/firefox'));

    var s2 = gulp.src('build/firefox/manifest.json')
            .pipe(jsonTransform(function (data, file)
            {
                data.name = data.name.replace(/-Dev$/, '');
                return data;
            }))
            .pipe(jsonmin())
            .pipe(gulp.dest('dist/firefox'));

    var s3 = gulp.src('build/firefox/**/*.js')
            .pipe(stripDebug())
            .pipe(gulp.dest('dist/firefox'));

    return merge(s1, s2, s3);
});

gulp.task('dist:firefox:compress', function () {
    var v = JSON.parse(fs.readFileSync('dist/firefox/manifest.json')).version;
    var c = [
        'web-ext build -v -s dist/firefox -a var/tmp/web-ext',
        'mv var/tmp/web-ext/peshtools-' + v + '.zip dist/release/peshtools-firefox-' + v + '.zip'
    ];

    exec(c.join(' && '), {stdio: 'inherit'});
});


/**
 * chrome
 * firefox
 * 
 * Ссылки на сборки релизов.
 */
gulp.task('chrome', function () {
    return runSequence(
            'build:common',
            'build:chrome',
            'dist:chrome'
        );
});

gulp.task('firefox', function () {
    return runSequence(
            'build:common',
            'build:firefox',
            'dist:firefox'
        );
});


/**
 * build:chrome:inc
 * build:firefox:inc
 * 
 * Инкремент номера сборки.
 */
gulp.task('build:chrome:inc', function () {
    return GetBuildID('chrome', true);;
});

gulp.task('build:firefox:inc', function () {
    return GetBuildID('firefox', true);;
});


/*******************************************************************************
 * 
 * Дополнительные функции.
 * 
 ******************************************************************************/


/**
 * Склеивает версию (мажор[.минор[.патч]]) и номер билда.
 * 
 * @param {String|Number} version
 * @param {String|Number} build
 * @return {String}
 */
var ComposeFullVersion = function (version, build)
{
    var tmp = version.split('.').slice(0, 3);

    tmp[0] = Math.max(0, parseInt(tmp[0])) || 0;
    tmp[1] = Math.max(0, parseInt(tmp[1])) || 0;
    tmp[2] = Math.max(0, parseInt(tmp[2])) || 0;
    tmp[3] = Math.max(1, parseInt(build));

    return tmp.join('.');
};


/**
 * Возвращает номер билда для указанного браузера.
 * 
 * @param {String} browser
 * @param {Boolean} increase
 *      Совершить инкремент билда, записать и использовать увеличенное значение.
 * @return {Number}
 */
var GetBuildID = function (browser, increase)
{
    console.log('GetBuildID("%s", %s)', browser, increase);

    if ('chrome' !== browser && 'firefox' !== browser)
    {
        throw 'invalid browser name';
    }

    try {
        var data = JSON.parse(fs.readFileSync('var/builds/' + browser + '.json', 'utf8'));

        if (increase)
        {
            data.build++;

            console.log('GetBuildID("%s", %s) increased: %d', browser, increase, data.build);

            fs.writeFileSync('var/builds/' + browser + '.json', JSON.stringify(data), 'utf8');
        }

        console.info('GetBuildID("%s", %s) retval: %d', browser, increase, data.build);

        return data.build;
    } catch (e)
    {
        console.warn('GetBuildID("%s", %s) var/build/%s.json not found', browser, increase, browser);
        console.warn('GetBuildID("%s", %s) retval: %d', browser, increase, 0);
        
        return 0;
    }
};


/**
 * Возвращает объект с ключами version и version_name,
 *  прочитанными из package.json.
 *  
 * @return {String}
 */
var GetPackageVersion = function ()
{
    var d = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    return {
        'version': d.version,
        'version_name': d.version_name
    };
};

// eof: /gulpfile.js
