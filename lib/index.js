/**
 * Дочерний процесс dbagent
 *
 *    Читает порты из файла ak.config, с которым запустили akumuli
 *    Открывает TCP сокет для записи
 *    Для чтения использует reader (httpclient)
 *
 *    Слушает и обрабатывает сообщения от главного процесса:
 *     запись в БД:  {id, type:'write', payload:[]}
 *      => преобразование payload => tcp.write. Ответ на сообщение не отправляется
 *
 *     чтение из БД: {id, type:'read', query:{start, end, dn|dn_prop, target}}
 *      => преобразование query => http.post => парсинг => ответ {id, query, payload}
 *
 *     статистика БД: {id, type:'stats'}
 *      => http.get => ответ {id, payload} // TODO - как то обработать?
 *
 * @param {<process>} channel -  передан из вызывающего модуля (==process)
 * @param {String} workingDir - параметр, переданный при запуске
 *                            - полный путь к WorkingDir основного процесса
 *                            - там ak.config
 *
 *
 * Отправляет главному процессу сообщения {log:''}, {error:''}
 * При неустранимой ошибке выходит
 *
 */

const util = require('util');
const fs = require('fs');
const path = require('path');
const net = require('net');

const utils = require('./utils');
const reader = require('./httpclient');

let fd_log;

module.exports = function(channel, workingDir) {
  const params = getParams(workingDir + '/ak.config');

  // Создать файл для логирования
  // Сохранять все, что пишется в БД - для тестовых целей
  fd_log = fs.openSync(getDbwLogFile(), 'a');

  reader.init({ port: params.HTTP.port });

  const tcpclient = net.createConnection({ port: params.TCP.port }, () => {
    send({ run: 1, log: 'connected to Akumuli TCP server on port: 8282' });
    // sendLog('connected to Akumuli TCP server on port: 8282');
  });

  channel.on('message', message => {
    const { id, type, query, payload } = message;

    switch (type) {
      case 'write':
        return tcpWrite(id, payload);

      case 'read':
        return readOnQuery(id, query);
    
      case 'stats':
        reader.getStats((err, result) => (err ? sendError(id, err) : send({ id, payload: result })));
        break;
      default:
    }
  });

  function getParams(filename) {
    try {
      const str = fs.readFileSync(filename, 'utf8');
      const pars = utils.parseAkConfig(str);
      if (!pars) throw { message: 'File parsing error ' + filename };
      if (!pars.TCP.port) throw { message: 'No TCP port in ' + filename };
      if (!pars.HTTP.port) throw { message: 'No HTTP port in ' + filename };
      console.log('Params from ' + filename + ': ' + util.inspect(pars));
      return pars;
    } catch (e) {
      sendError('', utils.getShortErrStr(e));
      process.exit(1);
    }
  }

  function readOnQuery(id, query) {
    const aq = utils.formQuery(query);
    if (!aq) return sendError(id, 'Invalid query: ' + JSON.stringify(query));

    // Возможно, нужно будет сделать несколько запросов!!
    reader.getData(id, aq, (err, result) => (err ? sendError(id, err) : sendParsedResult(id, query, result)));
  }

  function tcpWrite(id, payload) {
    if (!tcpclient) return;
    try {
      const str = utils.formToWrite(payload);
      // console.log('tcpWrite ' + payload.length + ' records');
      if (str) {
        tcpclient.write(str);
        writeLog(str);
      }
    } catch (e) {
      sendError(id, e);
      writeLog('tcpWrite error: ' + util.inspect(e));
    }
  }

  function send(message) {
    // console.log('CHILD SEND ' + util.inspect(message));
    channel.send(message);
  }

  function sendParsedResult(id, query, result) {
    // utils.fix(id, 'parseReadResult start');
    const { payload, error } = utils.parseReadResult(query, result);

    // utils.fix(id, 'parseReadResult end');
    return error ? sendError(id, error) : send({ id, query, payload });
  }

  function sendLog(text) {
    send({ log: text });
  }

  function sendError(id, err) {
    // console.log(`ERROR ${id} ${err || ''}`);
    send({ id, error: utils.getShortErrStr(err) });
  }

  function getDbwLogFile() {
    const name = 'dbw_' + utils.dateToISOString(new Date()) + '.log';
    return path.join(workingDir, name);
  }

  function writeLog(str) {
    fs.write(fd_log, '\n' + str, err => {
      if (err) sendLog('Error write log: ' + util.inspect(err));
    });
  }

  // Контроль за TCP сокетом
  // Отвечает, только если есть ошибка
  tcpclient.on('data', data => {
    sendError('', 'Akumuli TCP server response:' + data.toString());
  });

  tcpclient.on('error', e => {
    sendError('', 'Akumuli TCP server error:' + util.inspect(e));
    setTimeout(() => {
      process.exit(2);
    }, 500);
  });

  tcpclient.on('end', () => {
    sendLog('disconnected from Akumuli TCP server');
    setTimeout(() => {
      process.exit(1);
    }, 500);
  });
};
