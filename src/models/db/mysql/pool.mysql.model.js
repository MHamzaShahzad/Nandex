const mysql = require("mysql");

module.exports = class PoolDatabase {
  
  constructor(config) {
    this.pool = mysql.createPool(config);
  }

  query(sql, args) {
    return new Promise((resolve, reject) => {
      this.pool.query(sql, args, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.pool.end((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  getConnection() {
    return new Promise((resolve, reject) => {
      this.pool.getConnection(function (err, connection) {
        if (err) return reject(err);
        return resolve(connection);
      });
    });
  }

  connectionQuery(connection, sql, args) {
    return new Promise((resolve, reject) => {
      connection.query(sql, args, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  releaseConnection(poolConnection) {
    return new Promise((resolve, reject) => {
      try {
        this.pool.releaseConnection(poolConnection);
        resolve();
      } catch (err) {
        return reject(err);
      }
    });
  }
  
};
