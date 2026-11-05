const memjs = require('memjs');
const { memcached } = require('./config');

const client = memjs.Client.create(`${memcached.host}:${memcached.port}`);

function get(key) {
  return new Promise((resolve, reject) => {
    client.get(key, (error, value) => {
      if (error) {
        return reject(error);
      }

      if (value === null) {
        return resolve(null);
      }

      try {
        return resolve(JSON.parse(value.toString()));
      } catch (parseError) {
        return reject(parseError);
      }
    });
  });
}

function set(key, value, ttlSeconds) {
  return new Promise((resolve, reject) => {
    client.set(key, JSON.stringify(value), { expires: ttlSeconds }, (error) => {
      if (error) {
        return reject(error);
      }

      return resolve();
    });
  });
}

module.exports = { get, set };