/**
 *
 */

function formQuery(query) {
  // query = {from, to, select} => { select: 'value', range: { from: '20201029T000000', to } }
  const from = query.from;
  const to = query.to;
  delete query.from;
  delete query.to;
  return {range:{from, to}, ...query};
}

function parseReadResult(resStr) {
  if (resStr.substr(0, 1) == '-') {
    console.log('Read Result: ' + resStr);
    return { error: resStr };
  }

  const payload = [];
  const arr = resStr.split('\r\n');
  if (arr) {
    // Приходит по 3 строки на одно значение
    /*
     '+value dn=value\r\n' 
     '+20201029T074419.679000000\r\n' 
     '+22.0\r\n' 
    */
    for (let i = 0; i < arr.length; i += 3) {
      if (arr[i] && arr[i + 1] && arr[i + 2]) {
        // const seriesNameSplited = arr[i].split(' ');

        // const tagObj = querystring.parse(seriesNameSplited[1]);

        // const prop = seriesNameSplited[0].substr(1);
        const prop = 'value';
        const ts = arr[i + 1].substr(1, 18);
        const val = arr[i + 2].substr(1);
        payload.push(prop + ',' + ts + ',' + val);
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
  return date.getUTCFullYear() 
    + pad(date.getUTCMonth() + 1) 
    + pad(date.getUTCDate()) 
    +'T' + pad(date.getUTCHours()) 
    + pad(date.getUTCMinutes()) 
    + pad(date.getUTCSeconds());
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
  formQuery,
  parseReadResult,
  formToWrite,
  dateToISOString,
  fix,
  getShortErrStr
};
