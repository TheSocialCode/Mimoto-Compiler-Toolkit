const path = require('path');
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require('terser-webpack-plugin');

const DoneNotification = require('mimoto/toolkit/webpack/DoneNotification');


module.exports = {

    // --- Javascript ---

    entry: {
        '{{PROJECT_NAME}}': [
            './src/js/{{PROJECT_NAME}}.src.js'
        ]
    },
    output: {
        path: path.resolve(__dirname, 'public/static/js/core'),
        filename: '[name].js'
    },
    watch: true,
    mode: "development",


    // --- CSS ---

    module: {
        rules : [
            {
                test: /\.s?[ac]ss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    { loader: 'css-loader', options: { url: false, sourceMap: true } },
                    { loader: 'sass-loader', options: { sourceMap: true } }
                ],
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: ["babel-loader", "source-map-loader"]
            },
            {
                test: /\.html$/i,
                loader: 'html-loader',
                options: {
                    // Disables attributes processing
                    sources: false,
                    esModule: false
                },
            }
        ]
    },

    optimization: {
        minimizer: [new TerserPlugin({
            extractComments: false,
        })],
    },


    // --- output

    plugins: [
        new CleanWebpackPlugin(),
        new webpack.BannerPlugin('{{PROJECT_NAME}} by {{PROJECT_AUTHOR}}\n\nPlease support me by donating: https://paypal.me/thesocialcode\n'),
        // new WebpackManifestPlugin( { publicPath: "" } ),
        new MiniCssExtractPlugin({
            // filename: '[name].[chunkhash].css'
            filename: '[name].css'
        }),
        new DoneNotification()
    ]
};
