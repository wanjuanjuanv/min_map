import Taro, { Component } from '@tarojs/taro'
import { View } from '@tarojs/components'
import url from '@/common/utils/url'
import userApi from '@/common/api/user'
import { connect } from '@tarojs/redux'
import { dispatchPreLogin } from '@/common/store/actions/center'
import { dispatchQywxLogin, dispatchSetRedirectURL } from '@/common/store/actions/login'
import { AtToast } from "taro-ui"

/**
 * BASE_URL 在 config 中通过 defineConstants 定义的全局常量,直接拿来用
 */
@connect(state => state.login, {
  dispatchPreLogin,
  dispatchQywxLogin,
  dispatchSetRedirectURL
})
export default class Index extends Component {

  constructor(props) {
    super(props)
    this.state = {
      showLoginToast: false
    }
  }

  config = {
    navigationBarTitleText: 'Peoplus'
  }

  componentWillMount () {
    this.initLogin()
  }

  initLogin () {
    //已登录,直接跳转
    if (Taro.getStorageSync('session_id') && Taro.getStorageSync('businessURL').startsWith(BASE_URL)) {
      Taro.utils.reLaunch('/pages/helper/home/index')//跳到首页
    } else {
      let systemInfo = Taro.getSystemInfoSync()
      if (!systemInfo.environment || systemInfo.environment !== 'wxwork') {
        Taro.utils.reLaunch('/pages/login/login') //不是企业微信,去登录页
      } else {
        this.qyUserInfo()//企业微信,走登陆流程
      }
    }
    // Taro.utils.reLaunch('/pages/helper/home/index')//跳到首页
  }

  //1.开始企业微信登陆
  qyUserInfo () {
    wx.qy.login({
      success: res => {
        if (res.code) {
          this.getCompanyInfo(res.code)
        } else {
          wx.getNetworkType({
            //这里没走http请求,手动判断下有没有网
            success: res2 => {
              if (res2.networkType == 'none') {
                //是不是没网啊??刷新一次
                Taro.utils.showModal(
                  Taro.i18n.no_network,
                  undefined,
                  false,
                  () => {
                    Taro.utils.reLaunch('/pages/index/index')
                  }
                )
              } else {
                Taro.utils.showModal(`wx登录失败！${res.errMsg} index.v51`, undefined, false, () => {
                  Taro.utils.reLaunch('/pages/index/index')
                }, undefined, Taro.i18n.log_in_again)
              }
            }
          })
        }
      }
    })
  }

  //2.获取访问路径和公司信息
  async getCompanyInfo (code) {
    if (this.props.redirectURL) { //wx.showLoading最多只能展示7个字,用vant-weapp的loading组件吧
      this.setState({ showLoginToast: true })
    } else {
      Taro.utils.showLoading()
    }
    let res = await this.props.dispatchPreLogin({
      code,
      mini_program_code: 'configuration'
    })
    if (res.code == 0) {
      let { company_code, corpid, userid, request_url } = res.data
      if (!company_code) {
        Taro.utils.hideLoading()
        this.setState({ showLoginToast: false })
        Taro.utils.showModal('wx company_code get fail index.v74', undefined, false, () => {
          Taro.utils.reLaunch('/pages/index/index')
        }, undefined, Taro.i18n.log_in_again)
        return
      }
      //业务请求路径
      let business_url = `${BASE_URL}/transfer/${company_code.toLowerCase()}`
      //全局变量的businessURL
      url.setURL('rootBusinessURL', request_url)//客户站域名
      url.setURL('businessURL', business_url)//拼接后的域名
      //设置到本地缓存
      Taro.setStorageSync('rootBusinessURL', request_url)
      Taro.setStorageSync('businessURL', business_url)
      Taro.setStorageSync('company_code', company_code)
      this.qywxLogin(corpid, userid)
    } else {
      Taro.utils.hideLoading()
      this.setState({ showLoginToast: false })
      Taro.utils.showModal(res.msg) //无法识别当前公司
    }
  }

  //3.登陆
  qywxLogin (corpid, userid) {
    //企业微信登陆登陆后台
    wx.qy.login({
      success: async res => {
        if (res.code) {
          //登陆请求
          let data = await this.props.dispatchQywxLogin({
            code: res.code,
            mini_program_code: 'configuration',
            corpid,
            userid: userid,
            no_need_session: true //登陆请求不能在请求体中设置type=session,传参到request.js
          })
          if (data.code === 0) {
            //登录成功  
            Taro.setStorageSync('session_id', data.data.sid)
            //坑爹后台不返回用户信息,自己获取吧
            let userResult = await userApi.getBaseInformation()
            if (userResult.code == 0) {
              let userInfo = { ...userResult.data, uid: userResult.data.user_id }
              Taro.setStorageSync('userInfo', userInfo)
              if (this.props.redirectURL) {//如果缓存了页面,在跳回去  场景:sessiong过期后自动重登
                let redirectURL = this.props.redirectURL
                this.props.dispatchSetRedirectURL('')
                Taro.utils.redirectTo(redirectURL)
                return
              } else {
                Taro.utils.reLaunch('/pages/helper/home/index')//跳到首页
              }
            } else {
              Taro.utils.showModal(res.msg)
            }
          } else if (data.code === 1) {
            Taro.utils.hideLoading()
            this.setState({ showLoginToast: false })
            Taro.utils.showModal(`${userid} ${data.msg}`)
          } else {
            Taro.utils.hideLoading()
            this.setState({ showLoginToast: false })
            Taro.utils.showModal(data.msg)
          }
        } else {
          Taro.utils.hideLoading()
          this.setState({ showLoginToast: false })
          Taro.utils.showModal(`wx登录失败 ${res.errMsg} index.v112`, undefined, false, () => {
            Taro.removeStorageSync('session_id')
            Taro.utils.reLaunch('/pages/index/index')
          }, undefined, Taro.i18n.get('log_in_again'))
        }
      }
    })
  }

  render () {
    return <View >
      <AtToast //原生Toast最多只能展示7个字,用Taro-ui的Toast
        isOpened={this.state.showLoginToast}
        text={Taro.i18n.get('Session_expired')}//会话过期,重新登录
        status='loading'
        duration={0}
      />
    </View>
  }
}
