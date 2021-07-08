const Pusher = require('pusher');
const { pusher_app_id, pusher_app_key, pusher_app_secret, pusher_app_cluster } = require('./app.config').pusher_credentials

let pusher = new Pusher({
	appId: pusher_app_id,
	key: pusher_app_key,
	secret: pusher_app_secret,
	cluster: pusher_app_cluster,
	useTLS: true,
});

module.exports = {
	pusher,
	PusherTrigger: async (channel, event, data) => {
		console.log("CHECK_ME: " + channel + ' : ' + event + ' : ' + JSON.stringify(data));
		return new Promise((resolve, reject) => {
			pusher.trigger(channel, event, data, (error, request, response) => {
				if (error) {
					return reject(error);
				}
				//console.log(JSON.stringify(response));
				return resolve(response);
			});
		});
	},
};
