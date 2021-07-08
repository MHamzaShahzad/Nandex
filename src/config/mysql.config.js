const { mysql_connection_credentials } = require("../config/app.config");
const { Database, PoolDatabase } = require("../models/db/mysql/mysql.model");
const { host, user, password, database, port } = mysql_connection_credentials;
const config = {
  host,
  user,
  password,
  database,
  port,
  connectionLimit: undefined
};
console.log(JSON.stringify(config))
// Single Standalone Connection
const DatabaseObject = new Database(config);

// Pool Connection
config.connectionLimit = 99;
const DatabasePoolObject = new PoolDatabase(config);

const tablesPrefix = "";
const setPrefix = (tableName) => {
  return `${tablesPrefix}${tableName}`;
};

module.exports = {

  DatabasePoolObject,

  DatabaseObject,

  tables: {
    current_market: setPrefix("current_markets"),
    trading_times: setPrefix("trading_times"),
    custom_market: setPrefix("custom_market"),
    bets: setPrefix("bets"),
    sections: setPrefix("sections"),
  },

  getPoolConnectionPromissified: async () => {
    return new Promise((resolve, reject) => {
      DatabasePoolObject.pool.getConnection(function (err, connection) {
        if (err) {
          console.log(err);
          return reject(err);
        } else {
          console.log("MySQL Pool Connection Established");
          resolve(connection);
        }
      });
    });
  },

  getPoolConnection: () => {
    DatabasePoolObject.pool.getConnection((err, connection) => {
      if (err) {
        console.log(err);
        return err;
      } else {
        console.log("MySQL Pool Connection Established");
        return connection;
      }
    });
  },

  getConnectionPromissified: async () => {
    return new Promise((resolve, reject) => {
      DatabaseObject.connection.connect((error) => {
        if (error) {
          console.log(`MYSQL_CONNECTION_ERROR => ${error}`);
          return reject(error);
        }
        console.log("MySQL Single Connection Established");
        return resolve(DatabaseObject.connection);
      });
    });
  },

  getConnection: () => {
    DatabaseObject.connection.connect((error) => {
      if (error) {
        console.log(`MYSQL_CONNECTION_ERROR => ${error}`);
        return error;
      }
      console.log("MySQL Single Connection Established");
      return DatabaseObject.connection;
    });
  },

};
