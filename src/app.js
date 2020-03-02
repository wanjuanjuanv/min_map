import '@tarojs/async-await'
import Taro, { Component } from '@tarojs/taro'
import { Provider, connect } from '@tarojs/redux'
import * as actions from '@/common/store/actions/todo'
import utils from '@/common/utils/utils'
import configStore from '@/common/store'
import i18n from '@/common/i18n'
import Index from './pages/index/index'
import './app.scss'


// 如果需要在 h5 环境中开启 React Devtools
// 取消以下注释：
// if (process.env.NODE_ENV !== 'production' && process.env.TARO_ENV === 'h5')  {
//   require('nerv-devtools')
// }
Taro.setStorageSync('systemInfo', Taro.getSystemInfoSync()) //系统信息

const store = configStore() //redux

Taro.i18n = new i18n() //国际化

Taro.utils = utils //utils

Taro.$store = store //store

@connect(state => state.todo, actions)
class App extends Component {
  componentWillMount () {
    this.checkUpdate() //检查更新
    //生成linkid, token
    this.generateLinkid()
  }

  componentDidHide(){
    //从后台切入前台刷新,不用每次onshow来刷新, 在App.js => componentDidHide时设置TodoReload
    Taro.setStorageSync('TodoReload', true)
  }

  config = {
    pages: [
      'pages/index/index',
      'pages/login/login',
      'pages/helper/attendance/index',
      'pages/helper/attendance_android/index',
      'pages/helper/attendance_ios/index',
      'pages/helper/home/index',
    ],
    // subpackages: ROUTER,//  config/index.js中defineConstants中定义的全局路由变量
    window: {
      backgroundTextStyle: 'light',
      navigationBarBackgroundColor: '#4184E7',
      navigationBarTitleText: 'Peoplus',
      navigationBarTextStyle: 'white'
    },
    permission: {
      "scope.userLocation": {
        "desc": "你的位置信息将用于小程序位置接口的效果展示"
      }
    }
  }

  /**
   * 检查更新
   */
  checkUpdate () {
    if (Taro.canIUse('getUpdateManager')) {
      const updateManager = Taro.getUpdateManager()
      updateManager.onCheckForUpdate(res => {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(() => {
            Taro.utils.showModal(
              Taro.i18n.get('Update_content'),
              Taro.i18n.get('Update_tip'),
              false,
              () => {
                updateManager.applyUpdate()
              }
            )
          })
          updateManager.onUpdateFailed(() => {
            Taro.utils.showModal(
              Taro.i18n.get('del_old_version'),
              Taro.i18n.get('has_new_version')
            )
          })
        }
      })
    } else {
      Taro.utils.showModal(Taro.i18n.get('Update_latest_version'))
    }
  }
  generateLinkid () {
    // let uid = uuidv4().replace(/-/g, '')  uuidv4不能引入,先写死
    let uid = '4627d4d30b0f46dd86155a82d261dba9'
    Taro.setStorageSync('linkid', uid)
    Taro.setStorageSync('token', uid)
  }

  // 在 App 类中的 render() 函数没有实际作用
  // 请勿修改此函数
  render () {
    return (
      <Provider store={store}>
        <Index />
      </Provider>
    )
  }
}

Taro.render(<App />, document.getElementById('app'))
