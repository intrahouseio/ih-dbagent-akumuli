/**
 *
 */
const util = require('util');

/**
 * Разбор строк файла конфигурации (INI)
 *
 * @param {String} str
 * [TCP]
 * # Comment
 * port=8282
 *
 * @return {Object}
 * {TCP:{port:8282}}
 *
 */
function parseAkConfig(str) {
  if (!str) return;
  let currentSection = { name: '', fields: [] };
  const categories = [currentSection];
  const arr = str.split('\n');

  arr.forEach(line => {
    if (/^s*(#.*)?$/.test(line)) {
      return; // пустая строка или комментарий
    }

    let match;
    match = line.match(/^\[(.*)\]$/); // Секция

    if (match) {
      currentSection = { name: match[1], fields: [] };
      categories.push(currentSection);
    } else {
      match = line.match(/^(\w+)=(.*)$/); // name=value
      if (match) {
        currentSection.fields.push({
          name: match[1],
          value: match[2]
        });
      }
    }
  });

  // Массив => объект {TCP:{port:8282}, UDP:{port:8484, pool_size:1}}
  const res = {};
  categories.forEach(item => {
    if (item.name) {
      res[item.name] = {};
      item.fields.forEach(p => {
        res[item.name][p.name] = p.value;
      });
    }
  });
  return res;
}

function formQuery(query) {
  // query = {from, to, select} => { select: 'value', range: { from: '20201029T000000', to } }
  const from = query.from;
  const to = query.to;
  delete query.from;
  delete query.to;
  return { output: { format: 'csv', timestamp: 'raw' }, range: { from, to }, ...query };
}

function parseReadResult(resStr) {
  if (resStr.substr(0, 1) == '-') {
    console.log('Read Result: ' + resStr);
    return { error: resStr };
  }

  const payload = [];
  const arr = resStr.split('\n');
  if (arr) {
    // Приходит csv
    // value dn=TEMP1, 1453127844646397000, 999996 В ДОКУМЕНТАЦИИ
    // value dn=d8,ts=1604328801885000000,999996 ФАКТИЧЕСКИ ts=  

    for (let i = 0; i < arr.length; i ++) {
      if (arr[i]) {
        // console.log(i+' line '+arr[i]);

        const items = arr[i].split(',');
        
        const firstArr = items[0].split(' ');
        

        const prop = firstArr[0];
        const dn = firstArr[1].split('=').pop();
        const ts = items[1].substr(3, 13); // ts в формате Date.ts - 13 символов (без микросекунд)
        const val = items[2];
        payload.push(dn + ',' + prop + ',' + ts + ',' + val);
       
        // payload.push({ prop, ts, val, ...tagObj });
      }
    }
  }
  // console.log('payload =  '+util.inspect(payload));
  return { payload };
}

function formToWrite(payload) {
  /* Series name have the following format: <metric-name> <tags>, 
       where <tags> is a list of key-value pairs separated by space. 
       You should specify both metric name and tags (at least one key-value pair), otherwise it's not a valid
    */

  let str = '';
  payload.forEach(item => {
    str += `+${item.prop} dn=${item.dn}\r\n:${item.ts}000000\r\n+${item.val}\r\n`;
  });
  // +cpu_user.value host=hostname\r\n:1418224205000000000\r\n+22.0\r\n'
  // Date.now() = 1603956580565
  return str;
}

function dateToISOString(date) {
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds())
  );
}

function pad(val, width = 2) {
  return String(val).padStart(width, '0');
}

function fix(id, txt) {
  if (!id) return;
  const delta = Date.now() - parseInt(id.substr(1), 10);
  console.log(txt + ' ' + delta + ' мсек');
}

function getShortErrStr(e) {
  if (typeof e == 'object') return e.message ? getErrTail(e.message) : JSON.stringify(e);
  if (typeof e == 'string') return e.indexOf('\n') ? e.split('\n').shift() : e;
  return String(e);

  function getErrTail(str) {
    let idx = str.lastIndexOf('error:');
    return idx > 0 ? str.substr(idx + 6) : str;
  }
}

module.exports = {
  parseAkConfig,
  formQuery,
  parseReadResult,
  formToWrite,
  dateToISOString,
  fix,
  getShortErrStr
};
