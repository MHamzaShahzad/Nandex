const db = require('../../config/mysql.config')
const TAG = "db.model.js"
module.exports = {
    getActiveSymbols: () => {
        return new Promise((resolve, reject) => {
            db.DatabasePoolObject
                .query(`SELECT id, symbol, symbol_name FROM ??`, [db.tables.trading_times])
                .then((data) => {
                    console.log(`${TAG} getActiveSymbols: ${JSON.stringify(data)}`);
                    return resolve(data);
                })
                .catch((e) => {
                    console.log(`${TAG} getActiveSymbols-Error: ${e}`);
                    return reject(e);
                });
        });
    },
    insertCurrentMarket: (new_market) => {
        return new Promise((resolve, reject) => {
            db.DatabasePoolObject
                .query(`INSERT INTO ?? SET ?`, [db.tables.current_market, new_market])
                .then((data) => {
                    // console.log(`${TAG} insertCurrentMarket: ${JSON.stringify(data)}`);
                    return resolve(data);
                })
                .catch((e) => {
                    console.log(`${TAG} insertCurrentMarket-Error: ${e}`);
                    return reject(e);
                });
        });
    },
    getBets: (fk_section_id = null) => {
        return new Promise((resolve, reject) => {
            let query;
            let values = [];
            if (fk_section_id) {
                query = `SELECT COUNT(*) as counts, type, pair, start_interval, end_interval FROM ?? WHERE status = ? AND fk_section_id = ? AND end_interval = DATE_FORMAT(DATE_ADD(DATE_SUB(NOW(), INTERVAL SECOND(NOW()) SECOND), INTERVAL 1 MINUTE), "%Y-%m-%d %H:%i:%s") GROUP BY type, pair`;
                values = [db.tables.bets, 0, fk_section_id]
            } else {
                query = `SELECT COUNT(*) as counts, type, pair, start_interval, end_interval FROM ?? WHERE status = ? AND end_interval = DATE_FORMAT(DATE_ADD(DATE_SUB(NOW(), INTERVAL SECOND(NOW()) SECOND), INTERVAL 1 MINUTE), "%Y-%m-%d %H:%i:%s") GROUP BY type, pair`;
                values = [db.tables.bets, 0]
            }
            db.DatabasePoolObject
                .query(query, values)
                .then((data) => {
                    console.log(`${TAG} getBets: ${JSON.stringify(data)}`);
                    return resolve(data);
                })
                .catch((e) => {
                    console.log(`${TAG} getBets-Error: ${e}`);
                    return reject(e);
                });
        });
    },
    getAllSections: () => {
        return new Promise((resolve, reject) => {
            db.DatabasePoolObject
                .query(`SELECT id, section_seconds, expiry_seconds, status FROM ?? WHERE status = ?`, [db.tables.bets, 1])
                .then((data) => {
                    console.log(`${TAG} getAllSections: ${JSON.stringify(data)}`);
                    return resolve(data);
                })
                .catch((e) => {
                    console.log(`${TAG} getAllSections-Error: ${e}`);
                    return reject(e);
                });
        });
    },
    getIsCustomMarket: () => {
        return new Promise((resolve, reject) => {
            db.DatabasePoolObject
                .query(`SELECT market_value FROM ?? WHERE id = ? LIMIT 1`, [db.tables.custom_market, 1])
                .then((data) => {
                    console.log(`${TAG} getIsCustomMarket: ${JSON.stringify(data)}`);
                    return resolve(data);
                })
                .catch((e) => {
                    console.log(`${TAG} getIsCustomMarket-Error: ${e}`);
                    return reject(e);
                });
        });
    },
}
