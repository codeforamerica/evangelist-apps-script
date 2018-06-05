const path = require('path');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const GasPlugin = require('gas-webpack-plugin');

const process = require('process');


module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  context: __dirname,
  entry: './src/index.js',
  output: {
    filename: 'Code.gs',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['google-apps-script'],
          },
        },
      },
    ],
  },
  plugins: [
    new GasPlugin(),
    new CopyWebpackPlugin([{ from: 'appsscript.json', to: 'appsscript.json' }]),
  ],
};
