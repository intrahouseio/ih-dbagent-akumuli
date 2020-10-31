/**
 * dbagent.js
 * Точка входа при запуске дочернего процесса
 */

const dbagent = require('./lib/index');

dbagent(process);
