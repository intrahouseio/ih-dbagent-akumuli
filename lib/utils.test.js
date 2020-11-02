/* eslint-disable */
const util = require('util');

const expect = require('expect');
const utils = require('./utils');

describe('utils/parseAkConfig', () => {
  const ex1 = `
[TCP]
port=8282
`;

  const ex2 = `
[TCP]
port=8282

[HTTP]
port=8181
`;

  const ex3 = `
# HTTP API endpoint configuration

[HTTP]
# port number
port=8181


# TCP ingestion server config (delete to disable)

[TCP]
# port number
port=8282
# worker pool size (0 means that the size of the pool will be chosen automatically)
pool_size=0

`;

  describe('parseAkConfig', () => {
    it('one section, one key', () => {
      const str = ex1;
      const res = utils.parseAkConfig(str);
      console.log(util.inspect(res));
      expect(typeof res).toEqual('object');
      expect(res.TCP.port).toEqual('8282');
    });

    it('two sections, one key', () => {
      const str = ex2;
      const res = utils.parseAkConfig(str);
      console.log(util.inspect(res));
      expect(typeof res).toEqual('object');
      expect(res.HTTP.port).toEqual('8181');
      expect(res.TCP.port).toEqual('8282');
    });

    it('two sections, keys and comments', () => {
      const str = ex3;
      const res = utils.parseAkConfig(str);
      console.log(util.inspect(res, null, 4));
      expect(typeof res).toEqual('object');
      expect(res.HTTP.port).toEqual('8181');
      expect(res.TCP.port).toEqual('8282');
      expect(res.TCP.pool_size).toEqual('0');
    });
  });
});
