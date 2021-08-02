const DatabaseConfig = require('./config/mysql.config')
const PusherConfig = require('./config/pusher.config')
const DatabaseModel = require('./models/data/db.model')
const { ws_app_id } = require('./config/app.config')

const cron = require('node-cron');
const url = require('url');
const fs = require("fs");
const moment = require('moment');
const WebSocket = require('ws');

// read ssl certificate
const privateKey = fs.readFileSync('/etc/letsencrypt/live/binary.itempire.info/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/binary.itempire.info/fullchain.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const app = require('express')();
const { createServer } = require('https');
const server = createServer( credentials, app);
const wss = new WebSocket.Server({ server }),
    websockets = {},
    streamsUsers = {};
const closedMarkets = {};
const marketUpDown = {}
const cronJobs = []

const port = process.env.PORT || 80;
server.listen(port, (err) => {
    if (err) {
        console.log(err);
        return;
    }
    console.log(`Your server is ready on port ${port}`);
});

// BINARY CLIENT...
let ws;
const BINARY_PING_PONG_INTERVAL = 10000;

const binaryClientOpenListener = async () => {
    ws.isAlive = true
    await DatabaseConfig.getPoolConnectionPromissified().finally(() => {
        DatabaseConfig.DatabaseObject.close().catch(error => { console.log("Error in closing single object connection, may be it's already closed.") })
    })
    DatabaseModel.getActiveSymbols()
        .then(data => {
            data.forEach(element => {
                ws.send(JSON.stringify({
                    ticks: element.symbol,
                    subscribe: 1,
                    passthrough: { fk_market_id: element.id, symbol_name: element.symbol_name }
                }));
            });
        });
    restartCrons()
}

const binaryClientMessageListener = (data) => {
    // console.log('Received: %s', data);
    data = JSON.parse(data);
    switch (data.msg_type) {
        case 'tick':
            for (const streamers in streamsUsers) {

                if (closedMarkets[streamsUsers[streamers].ticks]) {
                    ws.send(JSON.stringify({
                        ticks: streamsUsers[streamers].ticks,
                        subscribe: 1
                    }))
                    delete closedMarkets[streamsUsers[streamers].ticks]
                }

                if (data.tick?.symbol == streamsUsers[streamers].ticks) {

                    if (marketUpDown[streamsUsers[streamers].ticks]) {
                        // const length = data.tick.quote.toString().split('.')[1].length
                        /* let number = '0.';
                        for (let i = 0; i < length - marketUpDown[streamsUsers[streamers].ticks].variation.toString().length; i++)
                            number += '0'
                        number += marketUpDown[streamsUsers[streamers].ticks].variation */
                        switch (marketUpDown[streamsUsers[streamers].ticks].type) {
                            case 0:
                                data.tick.quote += parseFloat((data.tick.quote / 100 * marketUpDown[streamsUsers[streamers].ticks].variation).toFixed(5))
                                // data.tick.quote += parseFloat(parseFloat(number).toFixed(length))
                                // data.tick.quote += parseFloat((marketUpDown[streamsUsers[streamers].ticks].variation).toFixed(5))
                                break;
                            case 1:
                                data.tick.quote -= parseFloat((data.tick.quote / 100 * marketUpDown[streamsUsers[streamers].ticks].variation).toFixed(5))
                                // data.tick.quote -= parseFloat(parseFloat(number).toFixed(length))
                                // data.tick.quote -= parseFloat((marketUpDown[streamsUsers[streamers].ticks].variation).toFixed(5))
                                break;
                        }
                    }

                    websockets[streamers]?.send(JSON.stringify(data))
                }

                if (data.error && data.echo_req.ticks == streamsUsers[streamers].ticks) {
                    websockets[streamers]?.send(JSON.stringify(data))
                    delete streamsUsers[streamers]
                }
            }

            if (data.error) {
                closedMarkets[data.echo_req.ticks] = data.echo_req.ticks
                break;
            }
            /* PusherConfig.PusherTrigger(`current_market_${data.tick.symbol}`, `current_market_tick`, {
                price: data.tick.quote,
                epoch: data.tick.epoch
            })*/
            DatabaseModel.insertCurrentMarket({
                fk_market_id: data.passthrough.fk_market_id,
                market_bid: data.tick.bid,
                market_time: moment(Date()).format('YYYY-MM-DD HH:mm:ss'),
                epoch: data.tick.epoch,
                active_symbol: data.tick.symbol,
                price: data.tick.quote,
            }).catch(error => {
                console.log(error)
            })
            break;
        default:
            websockets[data?.passthrough?.token]?.send(JSON.stringify(data))
            break;
    }
}

const binaryClientPongListener = async () => {
    console.log("BINARY_PONG")
    ws.isAlive = true
}

const binaryClientPingListener = async () => {
    console.log("BINARY_PINGING")
}

const binaryClientCloseListener = (event) => {
    if (ws) {
        console.error('Disconnected.');
    }

    ws = null
    // ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?l=EN&app_id=${ws_app_id}`)
    ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?l=EN&app_id=${ws_app_id}`, {
        origin: `https:////ws.binaryws.com/websockets/v3?l=EN&app_id=${ws_app_id}`
    });

    const duplex = WebSocket.createWebSocketStream(ws, { encoding: 'utf8' });
    duplex.pipe(process.stdout);
    process.stdin.pipe(duplex);

    ws.on('open', binaryClientOpenListener);
    ws.on('message', binaryClientMessageListener);
    ws.on('pong', binaryClientPongListener);
    ws.on('ping', binaryClientPingListener)
    ws.on('close', binaryClientCloseListener);
};

binaryClientCloseListener()

setInterval(() => {
    console.log('BINARY_PING_PONG_INTERVAL')
    if (ws && ws.readyState === WebSocket.OPEN) {
        if (ws.isAlive === false) return ws.terminate();

        ws.isAlive = false
        ws.ping()
    }

}, BINARY_PING_PONG_INTERVAL);

// SERVER...
const CLIENT_SERVER_PING_PONG_INTERVAL = 30000

function noop() { }

wss.on('connection', function connection(client_ws, req) {

    const { query: { token } } = url.parse(req.url, true);
    client_ws.isAlive = true;
    websockets[token] = client_ws;

    client_ws.on('pong', () => {
        console.log("CLIENT_PONG")
        client_ws.isAlive = true
    });

    client_ws.on('ping', () => {
        console.log("CLIENT_PINGING")
    });

    client_ws.on('message', function incoming(message) {
        console.log('received: %s', message);

        let jsonMessage = JSON.parse(message);

        if (jsonMessage?.ticks) streamsUsers[jsonMessage?.passthrough?.token] = jsonMessage
        else ws.send(JSON.stringify(jsonMessage))
        // client_ws.send(message)
    });

    client_ws.on('close', function () {
        delete websockets[token]
        delete streamsUsers[token]
        console.log('deleted: ' + token)
    });

});

wss.on('close', () => {
    clearInterval(interval);
})

const interval = setInterval(() => {
    console.log('CLIENT_SERVER_PING_PONG_INTERVAL')
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) return ws.terminate();

        ws.isAlive = false;
        ws.ping(noop);
    });
}, CLIENT_SERVER_PING_PONG_INTERVAL);

// OTHERS...

function cronTasks() {
    // CRON TASKS
    let upDownIndex = 0;
    let isStartTowardsCustom = true;
    let isStartTowardsOriginal = true;
    cronJobs.push(cron.schedule('45-59 0-59 * * * *', () => { // Every second for the interval of last 15 seconds of every minute
        console.log("--------------------------------------------------");
        console.log(`A Cron Task - READ - Time: ${new Date().toUTCString()}`);
        if (Object.keys(marketUpDown).length == 0)
            DatabaseModel.getIsCustomMarket()
                .then(isMarketCustom => {
                    return isMarketCustom[0].market_value == 1 ? DatabaseModel.getBets() : []
                })
                .then(data => {
                    data.forEach(element => {
                        if (marketUpDown[element.symbol] && element.counts > marketUpDown[element.symbol]?.counts) {
                            marketUpDown[element.symbol].type = element.type
                            marketUpDown[element.symbol].counts = element.counts
                            marketUpDown[element.symbol].diff = element.diff
                        } else if (marketUpDown[element.symbol] && marketUpDown[element.symbol]?.counts == element.counts) {
                            delete marketUpDown[element.symbol]
                        } else {
                            marketUpDown[element.symbol] = { counts: element.counts, type: element.type, diff: element.diff }
                        }
                    });
                });
        if (isStartTowardsCustom) {
            upDownIndex = 0
            isStartTowardsCustom = false
        }
        upDownIndex += 1

        Object.keys(marketUpDown).forEach(key => {
            marketUpDown[key].variation = randomNumber(0, marketUpDown[key].diff) * upDownIndex;
            // marketUpDown[key].variation = smoothNumber(0, marketUpDown[key].diff, marketUpDown[key].diff / 15, upDownIndex)
            // marketUpDown[key].variation = marketUpDown[key].diff * upDownIndex
        })
        console.log(`Object: ${JSON.stringify(marketUpDown)} - ${upDownIndex}: ${isStartTowardsCustom}`)
        console.log("--------------------------------------------------");
    }, { scheduled: false, timezone: 'Etc/UTC' }));

    cronJobs.push(cron.schedule('1-15 0-59 * * * *', () => { // Every second for the interval of first 15 seconds of every minute
        console.log("--------------------------------------------------");
        console.log(`B Cron Task - READ - Time: ${new Date().toUTCString()}`);
        
        if (isStartTowardsOriginal) {
            upDownIndex = 16
            isStartTowardsOriginal = false
        }
        upDownIndex -= 1

        Object.keys(marketUpDown).forEach(key => {
            marketUpDown[key].variation = randomNumber(0, marketUpDown[key].diff) * upDownIndex;
            // marketUpDown[key].variation = smoothNumber(0, marketUpDown[key].diff, marketUpDown[key].diff / 15, upDownIndex)
            // marketUpDown[key].variation = marketUpDown[key].diff * upDownIndex
        })
        console.log(`Object: ${JSON.stringify(marketUpDown)} - ${upDownIndex}: ${isStartTowardsOriginal}`)
        console.log("--------------------------------------------------");
    }, { scheduled: false, timezone: 'Etc/UTC' }));

    cronJobs.push(cron.schedule('16 0-59 * * * *', () => { // Every second for the interval of first 15 seconds of every minute
        console.log(`--------------------------------------------------`);
        console.log(`C Cron Task - READ - Time: ${new Date().toUTCString()}`);
        // market_changed = false
        if (Object.keys(marketUpDown).length > 0)
            Object.keys(marketUpDown).forEach(key => {
                delete marketUpDown[key];
            })
        isStartTowardsCustom = true
        isStartTowardsOriginal = true
        console.log(`WEB_SOCKET_STATUS: ${ws.readyState} : ${WebSocket.OPEN}`)
        console.log(`Object: ${JSON.stringify(marketUpDown)}`)
        console.log("--------------------------------------------------");
    }, { scheduled: false, timezone: 'Etc/UTC' }));
}
cronTasks()

function stopCrons() {
    cronJobs.forEach(cron => cron.stop());
}

function startCrons() {
    cronJobs.forEach(cron => cron.start());
}

function restartCrons() {
    stopCrons()
    startCrons()
}

function randomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function smoothNumber(start = 0, stop = 1, step = 0.1, index = 0) {
    return (start, stop, step = 1) =>
        Array(Math.ceil((stop - start) / step)).fill(start).map((x, y) => parseInt(x + y * step))[index]
}
