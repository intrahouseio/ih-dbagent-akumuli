/**
 *
 */
const util = require('util');
const net = require('net');

const utils = require('./utils');
const reader = require('./httpclient');

function main(channel) {
  reader.init({ port: 8181 }); // TODO - порты взять из аргументов

  const tcpclient = net.createConnection({ port: 8282 }, () => {
    sendLog('connected to Akumuli TCP server on port: 8282');
  });

  channel.on('message', message => {
    const { id, type, query, payload } = message;
    // console.log('dbagent_ak message ' + util.inspect(message));
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

  function tcpWrite(id, payload) {
    if (!tcpclient) return;
    try {
      const str = utils.formToWrite(payload);
      console.log('tcpWrite '+payload.length+' records')
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

module.exports = main;
