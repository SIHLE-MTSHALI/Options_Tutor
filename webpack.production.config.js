const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

/**
 * Production Webpack Configuration for Options Tutor
 * Optimized for performance, security, and minimal bundle size
 */

module.exports = {
  mode: 'production',
  target: 'electron-renderer',
  
  entry: {
    renderer: './src/index.tsx'
  },
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    clean: true,
    publicPath: './'
  },
  
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@redux': path.resolve(__dirname, 'src/redux'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@styles': path.resolve(__dirname, 'src/styles')
    }
  },
  
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile: 'tsconfig.production.json'
            }
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                auto: true,
                localIdentName: '[hash:base64:8]'
              },
              sourceMap: false
            }
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: false,
              sassOptions: {
                outputStyle: 'compressed'
              }
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpe?g|gif|svg|ico)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/images/[name].[hash][ext]'
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name].[hash][ext]'
        }
      }
    ]
  },
  
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.debug', 'console.info']
          },
          mangle: {
            safari10: true
          },
          format: {
            comments: false
          }
        },
        extractComments: false
      })
    ],
    
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
          reuseExistingChunk: true
        },
        redux: {
          test: /[\\/]src[\\/]redux[\\/]/,
          name: 'redux',
          chunks: 'all',
          priority: 8
        },
        services: {
          test: /[\\/]src[\\/]services[\\/]/,
          name: 'services',
          chunks: 'all',
          priority: 7
        },
        components: {
          test: /[\\/]src[\\/]components[\\/]/,
          name: 'components',
          chunks: 'all',
          priority: 6
        }
      }
    },
    
    runtimeChunk: {
      name: 'runtime'
    },
    
    usedExports: true,
    sideEffects: false
  },
  
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.REACT_APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
      'process.env.BUILD_DATE': JSON.stringify(new Date().toISOString())
    }),
    
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
      inject: true,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      }
    }),
    
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8
    }),
    
    // Bundle analyzer (only when ANALYZE=true)
    ...(process.env.ANALYZE === 'true' ? [
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        reportFilename: 'bundle-report.html'
      })
    ] : []),
    
    // Progress plugin for build feedback
    new webpack.ProgressPlugin({
      activeModules: false,
      entries: true,
      modules: true,
      modulesCount: 5000,
      profile: false,
      dependencies: true,
      dependenciesCount: 10000,
      percentBy: null
    })
  ],
  
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000, // 500KB
    maxAssetSize: 512000,
    assetFilter: (assetFilename) => {
      return assetFilename.endsWith('.js') || assetFilename.endsWith('.css');
    }
  },
  
  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false,
    entrypoints: false,
    excludeAssets: /\.(png|jpe?g|gif|svg|ico|woff|woff2|eot|ttf|otf)$/
  },
  
  devtool: false // No source maps in production
};