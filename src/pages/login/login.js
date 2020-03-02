import Taro, { Component } from '@tarojs/taro'
import { View, Image } from '@tarojs/components'
import { AtInput }  from 'taro-ui'
import centerApi from '@/common/api/center'
import loginApi from '@/common/api/login'
import crypto from '@/common/utils/crypto'
import url from '@/common/utils/url'
import logo from '@/common/assets/image/logo.png'
import icon_company from '@/common/assets/image/icon_company.png'
import icon_user from '@/common/assets/image/icon_user.png'
import icon_password from '@/common/assets/image/icon_password.png'
import icon_people from '@/common/assets/image/icon_people.png'
import './login.scss'

/* eslint-disable */
const baseUrl = BASE_URL //在 config 中的配置的BASE_URL
/* eslint-enable */
export default class Login extends Component {
  state = {
    companyCode: '',
    userName: '',
    password: ''
  }

  componentWillMount() {
    Taro.setNavigationBarTitle({
      title: Taro.i18n.get('login')
    })
  }

  config = {
    navigationBarBackgroundColor: '#1968C2',
    usingComponents: {
      //van-weapp组件
      'van-field': '../../common/components/vant-weapp/field/index',
      "van-icon": '../../common/components/vant-weapp/icon/index'
    }
  }

  async submit(){
    const {companyCode, userName, password} = this.state
    if (Taro.utils.isBlank(companyCode)) {
      Taro.utils.showModal(Taro.i18n.get('enter_company_code'))
      return
    }
    if (Taro.utils.isBlank(userName)) {
      Taro.utils.showModal(Taro.i18n.get('enter_user'))
      return
    }
    if (Taro.utils.isBlank(password)) {
      Taro.utils.showModal(Taro.i18n.get('enter_password'))
      return
    }
    Taro.utils.showLoading()
    let res = await centerApi.getCompanyByCode({
      company_code: companyCode
    })
    Taro.hideLoading()
    console.log('res', res)
    if (res.code == 0) {
      let businessURL = `${baseUrl}/transfer/${companyCode.toLowerCase()}`
      url.setURL('rootBusinessURL', res.request_url)
      url.setURL('businessURL', businessURL)
      //设置到本地缓存
      Taro.setStorageSync('rootBusinessURL', res.data.request_url)
      Taro.setStorageSync('businessURL', businessURL)
      Taro.setStorageSync('company_code', companyCode)
      this.login()
    } else {
      Taro.utils.showModal(res.msg)
    }
    Taro.hideLoading()
  }

  async login() {
    const {companyCode, userName, password} = this.state
    Taro.utils.showLoading()
    let res = await loginApi.login({
      loginname: userName,
      password: crypto.encrypt(password),
      type: 'basic',
      username: userName
    })
    console.log('res', res)
    if (res.code == 0) {
      let userInfo = {
        ...res.data,
        companyCode: companyCode,
        username: userName
      }
      Taro.setStorageSync('userInfo', userInfo)
      Taro.setStorageSync('session_id', userInfo.session_id)
      Taro.utils.reLaunch('/pages/helper/home/index')
    } else {
      Taro.hideLoading()
      Taro.utils.showModal(res.msg || res.error.message)
    }
  }

  render() {
    return (
      <View className='container'>
        <View className='row_logo'>
          <Image src={logo} className='image_logo' />
        </View>
        <View className='row_field'>
          <View className='row_field_box'>
            <Image src={icon_company} className='icon_field' />
            <AtInput
              clear
              placeholder={Taro.i18n.get('enter_company_code')} 
              value={this.state.companyCode}
              onChange={(e) => {this.setState({companyCode: e.toUpperCase()})}}
            />
          </View>
          <View className='row_field_box'>
            <Image src={icon_user} className='icon_field' />
            <AtInput
              clear
              placeholder={Taro.i18n.get('enter_user')}
              value={this.state.userName}
              onChange={(e) => {this.setState({userName: e})}}
            />
          </View>
          <View className='row_field_box'>
            <Image src={icon_password} className='icon_field' />
            <AtInput
              type='password'
              clear
              placeholder={Taro.i18n.get('enter_password')}
              value={this.state.password}
              onChange={(e) => {this.setState({password: e})}}
            />
          </View>
        </View>
        <View className='row-submit' onClick={this.submit.bind(this)}>{Taro.i18n.get('login')}</View>
        <Image src={icon_people} className='icon_people' />
      </View>
    )
  }
}
