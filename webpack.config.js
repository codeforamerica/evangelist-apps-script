const path = require('path');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const GasPlugin = require('gas-webpack-plugin');

const process = require('process');


module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  context: __dirname,
  entry: './src/index.js',
  resolve: {
    extensions: ['.js', '.ts'],
  },
  output: {
    filename: 'Code.gs',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        // NOTE: we intentionally DO NOT exclude `node_modules` from processing
        // with babel. See the commit 5550905 for details.
        test: /(\.js|\.ts)$/,
        use: 'babel-loader',
      },
    ],
  },
  plugins: [
    new GasPlugin(),
    new CopyWebpackPlugin([{ from: 'appsscript.json', to: 'appsscript.json' }]),
  ],
};
