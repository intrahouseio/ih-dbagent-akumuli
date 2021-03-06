/**
 *
 */

const util = require('util');

const callbackMap = {};

module.exports = {
  init(child) {
    this.dbagent = child;

    child.on('message', message => {
      // console.log('PARENT ON message ' + util.inspect(message));

      const handler = callbackMap[message.id];
      if (handler) {
        handler(null, message.payload);
        delete callbackMap[message.id];
      } else {
        this.parseOther(message);
      }
    });
  },

  // Отправляет запрос на статистику
  getStats() {
    const ts = Date.now();

    this.sendRequest('s' + ts, 'stats', {}, (err, result) => {
      const str = err ? util.inspect(err) : result;
      // console.log('STATS: ' + str);
    });
  },

  read(query) {
    // console.log('read START query='+util.inspect(query));
    const ts = Date.now();

    this.sendRequest('r' + ts, 'read', {query}, (err, result) => {
      const str = err ? util.inspect(err) : 'Records '+(result ? result.length : ' NO');
      // console.log('READ DATA: ' + str);
    });
  },

  write(payload) {
    // Пишем без ответа, обработчики не накапливаем
    const ts = Date.now();
    this.sendRequest('w' + ts, 'write', {payload}); 
  },

  sendRequest(id, type, req, callback) {
    if (id && callback) callbackMap[id] = callback;
    const sendObj = { id, type };
    if (type == 'read') sendObj.query = req.query;
    if (type == 'write') sendObj.payload = req.payload;
  
    if (this.dbagent.connected) this.dbagent.send(sendObj);
  },

  parseOther(message) {
    if (message.error) {
      console.log('ERROR from dbagent: ' + message.error);
    } else if (message.log) {
      console.log('LOG from dbagent: ' + message.log);
    }
  }
};
