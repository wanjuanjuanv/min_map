const path = require('path')

const config = {
  projectName: 'mini-helper',
  date: '2020-1-17',
  designWidth: 750,
  deviceRatio: {
    '640': 2.34 / 2,
    '750': 1,
    '828': 1.81 / 2
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: {
    babel: {
      sourceMap: true,
      presets: [
        [
          'env',
          {
            modules: false
          }
        ]
      ],
      plugins: [
        'transform-decorators-legacy',
        'transform-class-properties',
        'transform-object-rest-spread'
      ]
    },
    uglify: {//压缩js
      enable: true,
      config: {
        // 配置项同 https://github.com/mishoo/UglifyJS2#minify-options
        warnings: false,
        compress: {
          drop_debugger: true,
          drop_console: true,
        },
      }
    },
    csso: {//压缩css
      enable: true,
      config: {
        // 配置项同 https://github.com/css/csso#minifysource-options
      }
    }
  },
  alias: {
    '@': path.resolve(__dirname, '..', 'src'),
  },
  copy: {
    patterns: [
      {
        //Vant-weapp的组件还依赖工具库/src/components/vant-weapp/wxs
        //taro不会自动复制到dist, 需要在编译时自动复制到dist对应目录下
        from: 'src/common/components/vant-weapp/wxs/',
        to: 'dist/common/components/vant-weapp/wxs/'
      },
      {
        from: 'src/common/components/vant-weapp/picker-column/index.wxs',
        to: 'dist/common/components/vant-weapp/picker-column/index.wxs'
      }
    ],
    options: {}
  },
  weapp: {
    compile: {
      compressTemplate: true,//打包时是否需要压缩 wxml
    },
    module: {
      postcss: {
        autoprefixer: {
          enable: true,
          config: {
            browsers: ['last 3 versions', 'Android >= 4.1', 'ios >= 8']
          }
        },
        pxtransform: {
          enable: true,
          config: {},
          selectorBlackList: [
            /^.van-.*?$/,  //由于Vant-weapp的样式使用的单位是px, 会被taro编译成rpx 不让其单位转换
          ]
        },
        url: {
          enable: true,
          config: {
            limit: 10240 // 设定转换尺寸上限
          }
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      }
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    module: {
      postcss: {
        autoprefixer: {
          enable: true,
          config: {
            browsers: ['last 3 versions', 'Android >= 4.1', 'ios >= 8']
          }
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      }
    }
  }
}

module.exports = function (merge) {
  if (process.env.NODE_ENV === 'development') {
    return merge({}, config, require('./dev'))
  }
  return merge({}, config, require('./prod'))
}
