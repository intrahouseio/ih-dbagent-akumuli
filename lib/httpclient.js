/**
 *
 */
const util = require('util');
const http = require('http');

module.exports = {
  init({ host, port }) {
    this.host = host || 'localhost';
    this.port = port || 8181;
  },

  getStats(callback) {
    const options = {
      port: this.port,
      path: '/api/stats',
      method: 'GET'
    };
    console.log('HTTP getStats')
    this.request('', options, '', callback);
  },

  getData(id, query, callback) {
   
    query = JSON.stringify(query);
    const options = {
      port: this.port,
      path: '/api/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(query)
      }
    };
    this.request(id, options, query, callback);
  },

  request(id, options, data, callback) {
    
    // fix(id, 'request start.');
    const req = http.request(options, res => {
      if (res.statusCode !== 200) {
        const errStr = `Request ${options.path} Failed. statusCode ${res.statusCode}`;
        console.error(errStr);

        res.resume();
        return callback({ message: errStr });
      }

      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', chunk => {
        rawData += chunk;
      });

      res.on('end', () => {
        
        try {
          // const parsedData = JSON.parse(rawData);
          const parsedData = rawData;
          callback(null,  parsedData);
        } catch (e) {
          console.error(e.message);
          callback(e);
        }
      });
    });

    req.on('error', e => {
      console.log('REQ ERR: '+util.inspect(e))
      callback(e)
    });

    if (options.method == 'POST') req.write(data);
    req.end();
  }
};

