/**
 *
 */
const fs = require('fs');
const util = require('util');

const log = '/tmp/akumuli.log';

(async () => {
  try {
    const lines = await readLogTail(log, 4000);
    console.log(lines);
  } catch (err) {
    console.log('Error: ' + util.inspect(err));
  }

  async function readLogTail(f, bytes) {
    const NEW_LINE_CHARACTERS = '\n';
    return new Promise((resolve, reject) => {
      fs.stat(f, (err, stats) => {
        if (err) reject(err);

        const startByte = stats.size - bytes;
        fs.createReadStream(f, {
          start: startByte,
          end: stats.size
        }).addListener('data', data => {
          const str = data.toString();
          let result = '';
          if (str) {
            let idx = str.indexOf(NEW_LINE_CHARACTERS);
            result = idx > 0 && idx + 1 < str.length ? str.substr(idx) : str;
          }
          // Найти первый
          resolve(result);
        });
      });
    });
  }
})();
