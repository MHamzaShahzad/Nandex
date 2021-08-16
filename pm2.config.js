module.exports = {
    apps: [{
        name: 'nendx',
        script: 'start',
        instances: 1,
        cron_restart: '10 07 * * MON',
        /* env_development: {
          NODE_ENV: 'development'
        },
        env_production: {
          NODE_ENV: 'production'
        } */
    }]
}