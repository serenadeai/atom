'use strict';

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = [
    {
        name: 'extension',
        target: 'node',
        entry: {
            extension: './src/extension.ts',
        },
        output: {
            path: path.resolve(__dirname, 'build'),
            filename: '[name].js',
            libraryTarget: 'commonjs2',
            devtoolModuleFilenameTemplate: '../[resource-path]'
        },
        externals: {
            atom: 'atom'
        },
        devtool: 'source-map',
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            symlinks: false
        },
        plugins: [
            new CopyPlugin([{
                from: path.resolve(__dirname, 'src/shared/build/alternatives-panel.css'),
                to: path.resolve(__dirname, 'styles'),
            }]),
        ],
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/
                }
            ]
        }
    }
];

