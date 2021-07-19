const DatabaseConfig = require('./config/mysql.config')
const PusherConfig = require('./config/pusher.config')
const DatabaseModel = require('./models/data/db.model')
const { ws_app_id } = require('./config/app.config')

const cron = require('node-cron');
const url = require('url');
const moment = require('moment');
const WebSocket = require('ws');
// const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?l=EN&app_id=${ws_app_id}`);
let ws;
initSocketConnection()

const app = require('express')();
const { createServer } = require('http');
const server = createServer(app);
const wss = new WebSocket.Server({ server }),
    websockets = {},
    streamsUsers = {};
const closedMarkets = {};
const marketUpDown = {}

const port = process.env.PORT || 80;
server.listen(port, (err) => {
    if (err) {
        console.log(err);
        return;
    }
    console.log(`Your server is ready on post ${port}`);
});

// Client for Binary

ws.on('open', async function open() {
    ws, isAlive = true
    await DatabaseConfig.getPoolConnectionPromissified().finally(() => {
        DatabaseConfig.DatabaseObject.close()
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
            cronTasks()
        });
});

ws.on('message', function incoming(data) {
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
                        switch (marketUpDown[streamsUsers[streamers].ticks].type) {
                            case 0:
                                data.tick.quote += data.tick.quote / 100 * marketUpDown[streamsUsers[streamers].ticks].variation
                                break;
                            case 1:
                                data.tick.quote -= data.tick.quote / 100 * marketUpDown[streamsUsers[streamers].ticks].variation
                                break;
                            default:
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
            })
            break;
        default:
            websockets[data?.passthrough?.token]?.send(JSON.stringify(data))
            break;
    }
});

ws.on('close', initSocketConnection);

ws.on('pong', async function pong() {
    console.log("BINARY_PONG")
    ws.isAlive = true
});

ws.on('ping', async function ping() {
    console.log("BINARY_PINGING")
})

setInterval(function ping() {
    console.log('INTERVAL')
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false
    ws.ping()

}, 30000);

// Server
function noop() { }

wss.on('connection', function connection(client_ws, req) {

    const { query: { token } } = url.parse(req.url, true);
    client_ws.isAlive = true;
    websockets[token] = client_ws;

    client_ws.on('pong', () => {
        console.log("CLIENT_PONG")
        client_ws.isAlive = true
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

const interval = setInterval(function ping() {
    console.log('CLIENT_SERVER_INTERVAL')
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) return ws.terminate();

        ws.isAlive = false;
        ws.ping(noop);
    });
}, 30000);

wss.on('close', () => {
    clearInterval(interval);
})

function cronTasks() {
    // CRON TASKS
    cron.schedule('45-59 0-59 * * * *', () => { // Every second for the interval of last 15 seconds of every minute
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
                        } else if (marketUpDown[element.symbol] && marketUpDown[element.symbol]?.counts == element.counts) {
                            delete marketUpDown[element.symbol]
                        } else {
                            marketUpDown[element.symbol] = { counts: element.counts, type: element.type }
                        }
                    });
                });
        Object.keys(marketUpDown).forEach(key => {
            marketUpDown[key].variation = randomNumber(0, 3);
        })
        console.log(`Object: ${JSON.stringify(marketUpDown)}`)
        console.log("--------------------------------------------------");
    }, { timezone: 'Etc/UTC' });

    cron.schedule('0-15 0-59 * * * *', () => { // Every second for the interval of first 15 seconds of every minute
        console.log("--------------------------------------------------");
        console.log(`B Cron Task - READ - Time: ${new Date().toUTCString()}`);
        Object.keys(marketUpDown).forEach(key => {
            marketUpDown[key].variation = randomNumber(0, 3);
            marketUpDown[key].type = 0
        })
        console.log(`Object: ${JSON.stringify(marketUpDown)}`)
        console.log("--------------------------------------------------");
    }, { timezone: 'Etc/UTC' });

    cron.schedule('16 0-59 * * * *', () => { // Every second for the interval of first 15 seconds of every minute
        console.log(`--------------------------------------------------`);
        console.log(`C Cron Task - READ - Time: ${new Date().toUTCString()}`);
        if (Object.keys(marketUpDown).length > 0)
            Object.keys(marketUpDown).forEach(key => {
                delete marketUpDown[key];
            })
        console.log(`WEB_SOCKET_STATUS: ${ws.readyState}`)
        if (ws.readyState !== WebSocket.OPEN)
            // ws.terminate()
            initSocketConnection()
        console.log(`Object: ${JSON.stringify(marketUpDown)}`)
        console.log("--------------------------------------------------");
    }, { timezone: 'Etc/UTC' });
}

function initSocketConnection() {

    // if (ws) ws.terminate()
    // ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?l=EN&app_id=${ws_app_id}`)
    ws = null
    ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?l=EN&app_id=${ws_app_id}`, {
        origin: `https:////ws.binaryws.com/websockets/v3?l=EN&app_id=${ws_app_id}`
    });

    const duplex = WebSocket.createWebSocketStream(ws, { encoding: 'utf8' });
    duplex.pipe(process.stdout);
    process.stdin.pipe(duplex);
}

function randomNumber(min, max) {
    return Math.random() * (max - min) + min;
}
