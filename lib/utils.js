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
  // query = {start:ts, end:ts, dn:'DN002'|dn_prop:'DN002.value,...', target:'trend' | 'table'}
  // => { select: 'DN002',<where:{prop:'value'}>, range: { from: '20201029T000000', to } }
  // ИЛИ
  // => { join: ['AI001','DN002'], where:{prop:'value'}, range: { from: '20201029T000000', to } }

  const q1 = {};

  if (query.dn_prop) {
    const dnArr = query.dn_prop.split(',');
    if (dnArr.length > 1) {
      // использовать join
      Object.assign(q1, getJoinObj(dnArr));
    } else if (dnArr.length == 1) {
      // использовать  select
      Object.assign(q1, getSelectObj(dnArr[0]));
    } else return; // не определено!!
  } else if (query.dn) {
    // Все свойства для устройства
    q1.select = query.dn;
  } else return;

  q1.output = { format: 'csv', timestamp: 'raw' };

  const from = dateToISOString(new Date(Number(query.start))) + '.000';
  const to = dateToISOString(new Date(Number(query.end))) + '.000';
  q1.range = { from, to };

  console.log('FORM QUERY ' + util.inspect(q1));
  return q1;
  // return { output: { format: 'csv', timestamp: 'raw' }, range: { from, to }, ...query };
}

function getJoinObj(dnArr) {
  const metrics = [];
  for (let dnprop of dnArr) {
    const splited = dnprop.split('.');
    if (splited[0]) metrics.push(splited[0]);
  }
  return { join: metrics, where: { prop: 'value' } };
}

function getSelectObj(dnprop) {
  const splited = dnprop.split('.');
  return { select: splited[0], where: { prop: splited[1] } };
}

function parseReadResult(query, resStr) {
  if (resStr.substr(0, 1) == '-') {
    console.log('Read Result: ' + resStr);
    return { error: resStr };
  }

  // TEMP1 prop=value,ts=1604328801885000000,999996 \n  select

  // DN002|AI005 prop=value,ts=1605614617861000000,6,7  join
  // DN002|AI005 prop=value,ts=1605614617861000000,,77
  // DN002|AI005 prop=value,ts=1605614617861000000,7,
  const arr = resStr.split('\n');
  // В зависимости от query.target - вернуть массив для графика или для таблицы
  const payload = query.target == 'trend' ? formForTrend(query, arr) : formForTable(query, arr);
  return { payload };
}

function formForTrend(query, arr) {
  // => [[1605560400000, 42,null], [1605560400000,null,24], ..]
  const len = query.dn_prop ? query.dn_prop.split(',').length : 1;
  const res = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) {
      const lineArr = arr[i].split(',');
      const one = new Array(len + 1).fill(null);
      one[0] = Number(lineArr[1].substr(3, 13)); // ts в формате Date.ts - 13 символов (без микросекунд)
      for (let j = 0; j < len; j++) {
        if (lineArr[2 + j].length) one[1 + j] = Number(lineArr[2 + j]); // 2 - первое значение
      }
      res.push(one);
    }
  }
  return res;
}


function formForTable(query, arr) {
  // TEMP1 prop=value,ts=1604328801885000000,999996 \n  select
  // => [{dn:'DN002', prop:'value', ts: , val:42}]
  // TODO - если был запрос join - нужно добавить несколько строк?
  const res = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) {
      const lineArr = arr[i].split(',');
      const [dn,prop] = lineArr[0].split(' '); 
      const ts = Number(lineArr[1].substr(3, 13));
      const val = Number(lineArr[2]); 
      res.push({dn, prop, ts, val});
    }
  }
  return res;
}


/*
  const payload = [];
  const arr = resStr.split('\n');
  if (arr) {
    // Приходит csv
    // value dn=TEMP1, 1453127844646397000, 999996 В ДОКУМЕНТАЦИИ
    // value dn=d8,ts=1604328801885000000,999996 ФАКТИЧЕСКИ ts=  
    // LAST VER
    // TEMP1 prop=value,ts=1604328801885000000,999996 

    for (let i = 0; i < arr.length; i ++) {
      if (arr[i]) {
        // console.log(i+' line '+arr[i]);

        const items = arr[i].split(',');
        
        const firstArr = items[0].split(' ');
        

        // const prop = firstArr[0];
        // const dn = firstArr[1].split('=').pop();
        const dn = firstArr[0];
        const prop = firstArr[1].split('=').pop();
        const ts = items[1].substr(3, 13); // ts в формате Date.ts - 13 символов (без микросекунд)
        const val = items[2];
        payload.push(dn + ',' + prop + ',' + ts + ',' + val);
       
        // payload.push({ prop, ts, val, ...tagObj });
      }
    }
  }
  // console.log('payload =  '+util.inspect(payload));
  return { payload };
  */

function formToWrite(payload) {
  /* Series name have the following format: <metric-name> <tags>, 
       where <tags> is a list of key-value pairs separated by space. 
       You should specify both metric name and tags (at least one key-value pair), otherwise it's not a valid
    */

  let str = '';
  payload.forEach(item => {
    // str += `+${item.prop} dn=${item.dn}\r\n:${item.ts}000000\r\n+${item.val}\r\n`;
    str += `+${item.dn} prop=${item.prop}\r\n:${item.ts}000000\r\n+${item.val}\r\n`;
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
