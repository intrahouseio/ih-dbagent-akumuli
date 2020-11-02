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
 *     чтение из БД: {id, type:'read', query:{from, to, select}} 
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
const net = require('net');

const utils = require('./utils');
const reader = require('./httpclient');

module.exports  = function(channel, workingDir) {
  
  const params = getParams(workingDir+'/ak.config');

  reader.init({ port: params.HTTP.port });

  const tcpclient = net.createConnection({ port: params.TCP.port }, () => {
    sendLog('connected to Akumuli TCP server on port: 8282');
  });

  channel.on('message', message => {
    const { id, type, query, payload } = message;

    switch (type) {
      case 'write':
        return tcpWrite(id, payload);

      case 'read':
        reader.getData(id, utils.formQuery(query), (err, result) =>
          err ? sendError(id, err) : sendParsedResult(id, query, result)
        );
        break;

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
      console.log('Params from '+filename+': '+util.inspect(pars));
      return pars;
    } catch (e) {
      sendError('', utils.getShortErrStr(e));
      process.exit(1);
    }
  }

  function tcpWrite(id, payload) {
    if (!tcpclient) return;
    try {
      const str = utils.formToWrite(payload);
      console.log('tcpWrite ' + payload.length + ' records');
      if (str) tcpclient.write(str);
    } catch (e) {
      sendError(id, e);
    }
  }

  function send(message) {
    // console.log('CHILD SEND ' + util.inspect(message));
    channel.send(message);
  }

  function sendParsedResult(id, query, result) {
    utils.fix(id, 'parseReadResult start');
    const { payload, error } = utils.parseReadResult(result);

    utils.fix(id, 'parseReadResult end');
    return error ? sendError(id, error) : send({ id, query, payload });
  }

  function sendLog(text) {
    send({ log: text });
  }

  function sendError(id, err) {
    // console.log(`ERROR ${id} ${err || ''}`);
    send({ id, error: utils.getShortErrStr(err) });
  }

  // Контроль за TCP сокетом
  // Отвечает, только если есть ошибка
  tcpclient.on('data', data => {
    sendError('', 'Akumuli TCP server response:' + data.toString());
  });

  tcpclient.on('error', e => {
    sendError('', 'Akumuli TCP server error:' + util.inspect(e));
    tcpclient.end();
    process.exit(1);
  });

  tcpclient.on('end', () => {
    sendLog('disconnected from Akumuli TCP server');
    process.exit(1);
  });
}
