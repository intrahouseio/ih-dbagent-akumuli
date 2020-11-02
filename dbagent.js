/**
 * dbagent.js
 * Точка входа при запуске дочернего процесса
 * Входной параметр - путь к файлу конфигурации
 */

const util = require('util');

const dbagent = require('./lib/index');

/*
console.log('process.argv='+util.inspect(process.argv));
process.argv=[
  '/usr/local/bin/node',
  '/home/pi/ih-akumuli/dbagent.js',
  '/home/pi/ih-akumuli'   // аргумент - workingDir
]
*/
dbagent(process, process.argv[2]);
