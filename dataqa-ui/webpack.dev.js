const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');

module.exports =  merge(common, {
    mode: 'development',
    devtool: 'eval-cheap-module-source-map',
    devServer: {
        static: {
            directory: path.join(__dirname, 'public'),
        },
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                secure: false
            }
        },
        historyApiFallback: true,
        hot: true
    }
});
