/**
 * app.js
 *
 * Главный модуль для запуска dbagent-а как отдельного приложения (для тестов и отладки)
 *
 *  akumuli и dbagent запускаются как child_process
 */

const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');

const startengine = require('./startengine');
const dbconnector = require('./core/dbconnector');
const utils = require('./lib/utils');

let engine;
let dbagent;

try {
  const workpath = path.resolve(process.cwd());
  // const config = getConfig(path.join(workpath,'config_akumuli.json')); 
  // config.path_akconfig = path.join(workpath, 'ak.config');

  // Запуск  akumuli. Передать путь к рабочей папке
  engine = startengine(workpath); // При ошибке - throw

  // Запуск  dbagent-a
  const dbagent_path = './dbagent.js';
  if (!fs.existsSync(dbagent_path)) throw { message: 'File not found: ' + dbagent_path };

  dbagent = fork(dbagent_path,[workpath]); // Параметр - путь к ak.config

  // dbconnector - объект для отправки запросов
  dbconnector.init(dbagent);

  // Получить статистику
  setTimeout(() => {
    dbconnector.getStats();
  }, 1000);

  // Писать периодически по 10 значений
  setInterval(() => {
    dbconnector.write(genData());
  }, 1000);

  // Читать записи за последний час каждые x сек
  // По всем устройствам сразу
  // TODO - потом по каждому отдельно??
  
  setInterval(() => {
    const ts = Date.now();
    const from = utils.dateToISOString(new Date(ts - 3600 * 1000));
    const to = utils.dateToISOString(new Date(ts));
    dbconnector.read({ from, to, select: 'value' });
  }, 60000);
  

  // -------
  // Контроль за дочерними процессами
  engine.stdout.on('data', data => {
    console.log('INFO: ' + data.toString());
  });

  engine.on('error', err => {
    console.log('ERROR: Akumuli start error! ' + utils.inspect(err));
  });

  engine.on('exit', code => {
    console.log('ERROR: Akumuli stopped with code ' + code);
  });

  dbagent.on('exit', code => {
    // Агент закончил -завершить основной процесс
    processExit('ERROR: dbagent stopped with code ' + code);
  });
} catch (e) {
  processExit(utils.getShortErrStr(e));
}

function getConfig(filename) {
  if (fs.existsSync(filename)) return JSON.parse(fs.readFileSync(filename, 'utf8'));

  // Создать по умолчанию
  const data = {
    path_akumulid: '/opt/akumuli/akumulid',
    path_akdb: '/home/pi/akdb'
  };

  fs.writeFileSync(filename, JSON.stringify(data), 'utf8');
  return data;
}

// Генерирует  данные для записи
function genData() {
  const ts = Date.now();
  const arr = [];
  for (let i = 0; i < 10; i++) {
    const val = Math.round(Math.random() * 10);
    arr.push({ dn: 'd' + String(i), prop: 'value', ts, val });
  }
  return arr;
}

function processExit(text = '') {
  console.log(text + '  Main process stopped');
  process.exit();
}

process.on('exit', () => {
  if (dbagent && dbagent.connected) dbagent.disconnect();
  if (engine) engine.kill();
});
