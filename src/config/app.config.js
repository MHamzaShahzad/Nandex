const {

  STR_ENV_DEV,
  STR_ENV_STAGING,
  STR_ENV_PROD,

  MONGO_URI_DEV,
  MONGO_URI_STAGING,
  MONGO_URI_PROD,

  MYSQL_DATABASE_DEV,
  MYSQL_USER_DEV,
  MYSQL_PASS_DEV,
  MYSQL_HOST_DEV,
  MYSQL_PORT_DEV,

  MYSQL_DATABASE_STAGING,
  MYSQL_USER_STAGING,
  MYSQL_PASS_STAGING,
  MYSQL_HOST_STAGING,
  MYSQL_PORT_STAGING,

  MYSQL_DATABASE_PROD,
  MYSQL_USER_PROD,
  MYSQL_PASS_PROD,
  MYSQL_HOST_PROD,
  MYSQL_PORT_PROD,

  PUSHER_APP_ID_DEV,
  PUSHER_APP_KEY_DEV,
  PUSHER_APP_SECRET_DEV,
  PUSHER_APP_CLUSTER_DEV,

  PUSHER_APP_ID_STAGING,
  PUSHER_APP_KEY_STAGING,
  PUSHER_APP_SECRET_STAGING,
  PUSHER_APP_CLUSTER_STAGING,

  PUSHER_APP_ID_PROD,
  PUSHER_APP_KEY_PROD,
  PUSHER_APP_SECRET_PROD,
  PUSHER_APP_CLUSTER_PROD,

  WS_APP_ID_DEV,
  WS_APP_ID_STAGING,
  WS_APP_ID_PROD,

} = require("../constants");
require("dotenv").config();

const env = process.env.NODE_ENV;

let mongo_uri = "";
let mysql_connection_credentials = {}
let pusher_credentials = {}
let ws_app_id = null

switch (env) {
  case STR_ENV_DEV:
    mysql_connection_credentials = {
      host: MYSQL_HOST_DEV,
      user: MYSQL_USER_DEV,
      password: MYSQL_PASS_DEV,
      port: MYSQL_PORT_DEV,
      database: MYSQL_DATABASE_DEV,
    }
    pusher_credentials = {
      pusher_app_id: PUSHER_APP_ID_DEV,
      pusher_app_key: PUSHER_APP_KEY_DEV,
      pusher_app_secret: PUSHER_APP_SECRET_DEV,
      pusher_app_cluster: PUSHER_APP_CLUSTER_DEV,
    }
    mongo_uri = MONGO_URI_DEV
    ws_app_id = WS_APP_ID_DEV
    break;
  case STR_ENV_STAGING:
    mysql_connection_credentials = {
      host: MYSQL_HOST_STAGING,
      user: MYSQL_USER_STAGING,
      password: MYSQL_PASS_STAGING,
      port: MYSQL_PORT_STAGING,
      database: MYSQL_DATABASE_STAGING,
    }
    pusher_credentials = {
      pusher_app_id: PUSHER_APP_ID_STAGING,
      pusher_app_key: PUSHER_APP_KEY_STAGING,
      pusher_app_secret: PUSHER_APP_SECRET_STAGING,
      pusher_app_cluster: PUSHER_APP_CLUSTER_STAGING,
    }
    mongo_uri = MONGO_URI_STAGING
    ws_app_id = WS_APP_ID_STAGING
    break;
  case STR_ENV_PROD:
    mysql_connection_credentials = {
      host: MYSQL_HOST_PROD,
      user: MYSQL_USER_PROD,
      password: MYSQL_PASS_PROD,
      port: MYSQL_PORT_PROD,
      database: MYSQL_DATABASE_PROD,
    }
    pusher_credentials = {
      pusher_app_id: PUSHER_APP_ID_PROD,
      pusher_app_key: PUSHER_APP_KEY_PROD,
      pusher_app_secret: PUSHER_APP_SECRET_PROD,
      pusher_app_cluster: PUSHER_APP_CLUSTER_PROD,
    }
    mongo_uri = MONGO_URI_PROD
    ws_app_id = WS_APP_ID_PROD
    break;
  default:
    break;
}


module.exports = {
  env,
  mongo_uri,
  mysql_connection_credentials,
  pusher_credentials,
  ws_app_id
};
