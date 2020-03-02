import Taro, { Component } from '@tarojs/taro'
import { View, Text, Textarea, Image, Map, CoverView, CoverImage } from '@tarojs/components'
import { AtModal, AtModalHeader, AtModalContent, AtModalAction, AtInput } from "taro-ui"

import markerPng from '@/common/assets/image/ic_address_location@2x.png'
import ImageLocation from '@/common/assets/image/ic_helper_attendance_location.png'
import ImageSign from '@/common/assets/image/ic_helper_attendance_sign.png'
import ImageWeizi from '@/common/assets/image/ic_helper_attendance_weizi.png'
import ImageSanjiao from '@/common/assets/image/ic_helper_attendance_sanjiao.png'

import helperApi from '@/common/api/helper'
import baiduApi from '@/common/api/baidu'

import tools from '@/common/utils/tools'

import './index.scss';

export default class HelperAttendance extends Component {
    constructor(props) {
        super(props)
        this.mapCtx;
        this.wgsLatitude="", //wgs 坐标系
        this.wgsLongitude="",
        this.baiduLatitude=0.0, //百度 坐标系
        this.baiduLongitude=0.0,
        this.state={
          init: false,
            latitude: '',
            longitude: '',
            markers: [],
            currentLocation: {},
            locationList:[],
            locationVisible: false,
            addressDetail: '', //地址详情
            inputModalVisible:false, //修改考勤点名称弹框
            attendanceName:'', //考勤点名称
            
        }
    }

    config = {
      usingComponents: {
        //van-weapp组件
        'van-picker': '../../../common/components/vant-weapp/picker/index',
        'van-popup': '../../../common/components/vant-weapp/popup/index',
      }
  }

    componentDidMount () {
      this.getLocation()
      this.mapCtx = Taro.createMapContext('container') //container是地图显示模块id
      this.getAttendancePoints()
    }

    /**
     * 管理考勤点列表
     */
    async getAttendancePoints(){
      Taro.utils.showLoading()
      let res = await helperApi.getAttendancePoints()
      console.log('getAttendancePoints----->', res)
      Taro.utils.hideLoading()
      if(res.code == 0){
          let data = res.data
          data.forEach(element => {
            element.value = element.id,
            element.label = element.name
          });
          this.setState({
            locationList: data,
          })
      }else{
          Taro.utils.showModal(res.msg)
      }
    }

  /**
  * 获取位置
  */
  getLocation() {
    Taro.utils.showLoading()
    let p_gps = new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        success: async res => {
          let { longitude, latitude } = res
          console.log('gcj02腾讯地图获取的经纬度---->',longitude,latitude)
          // let array = tools.convertGCJ02ToBD09(latitude, longitude)
          // console.log('代码腾讯经纬度转换为百度经纬度----->', array)
          this.wgsLatitude = latitude
          this.wgsLongitude = longitude
          //转换成百度经纬度
          await this.getBaiduLocationGPS(`${longitude}, ${latitude}`, 3)
          resolve(res)
        },
        fail: err => {
          Taro.utils.hideLoading()
          this.setState({
            addressDetail: Taro.i18n.get('Get_location_information_failed')
          })
          console.log('this.addressDetail', err)
          Taro.getNetworkType({
            success: res => {
              if (res.networkType == 'none') {
                //是不是没网啊??
                Taro.utils.showModal(Taro.i18n.get('no_network'))
              } else {
                //是否开启定位权限
                this.getSetting(err)
              }
            }
          })
          reject(Taro.i18n.get('Get_location_information_failed'))
        }
      })
    })
    //获取gps位置后
    p_gps.then(res => {
      Taro.utils.hideLoading()
      this.setState({
        latitude: res.latitude,
        longitude: res.longitude,
        init: true
      })
    })
    .catch(err => {
      Taro.utils.hideLoading()
      this.setState({addressDetail: Taro.i18n.get('Get_location_information_failed')})
    })
  }

  /**
   * 获取百度经纬度 wgs坐标转百度bd09ll 1- 5
   */
  async getBaiduLocationGPS(location, from = 1) {
    let res = await baiduApi.getBaiduLocationGPS(location, from)
    if (res.status === 0 && res.result.length > 0) {
      let { x, y } = res.result[0]
      console.log('接口腾讯经纬度转换为百度经纬度------->', x,y)
      this.getAddressDetail(x, y)
    } else {
      Taro.hideLoading()
      this.setState({addressDetail: Taro.i18n.get('Get_location_information_failed')})
      Taro.utils.showModal('getBaiduLocationGPS err' + JSON.stringify(res))
    }
  }

  /**
   * 获取百度地址
   */
  async getAddressDetail(x, y){
    let address = await baiduApi.getAddressDetail(`${y}, ${x}`)
    this.baiduLongitude = x
    this.baiduLatitude = y
    // let array = tools.bMapToQQMap(y, x)
    // console.log('代码百度地图坐标转换成腾讯地图坐标----->', array)
    
    this.setState({
      addressDetail: address.result.formatted_address,
      // latitude: y,
      // longitude: x
    })
  }

  /**
   * 检查授权定位
   */
  getSetting(locationErr) {
    wx.getSetting({
      success: res => {
        //未授权获取地理位置
        if (!res.authSetting['scope.userLocation']) {
          Taro.utils.showModal(
            Taro.i18n.get('authorize_geographic_location'),
            undefined,
            undefined,
            () => {
              Taro.openSetting({
                success: res => {
                  console.log(res.authSetting)
                }
              })
            }
          )
        } else {
          //在第一次获取位置失败时帮助重新获取一次, 场景: 第一次打开小程序时,老半天不点允许授权地理位置按钮,微信会获取位置失败,给个友好提示
          if (!Taro.getStorageSync('already_reload')) {
            //授权提示后只刷新一次
            Taro.utils.showModal(
              Taro.i18n.get('Locate_authorization_timeout'),
              undefined,
              false,
              () => {
                this.handleRefreshLocation()
                Taro.setStorageSync('already_reload', true)
              },
              undefined,
              Taro.i18n.get('getLocation_again')
            )
          } else {
            Taro.utils.showModal(Taro.i18n.get('Failed_to_retrieve_location'))
          }
        }
      }
    })
  }

    regionchange = (e) => {
        console.log(e)
        let _this = this
        if (e.type == 'end') {
          //获取当前地图中心的经纬度。返回的是 gcj02 坐标系
          this.mapCtx.getCenterLocation({
            success: function (res) {
              console.log(res)
              let { longitude, latitude } = res
              _this.wgsLatitude = latitude
              _this.wgsLongitude = longitude
              // _this.setState({
              //   latitude,
              //   longitude
              // })
              //转换成百度经纬度
              _this.getBaiduLocationGPS(`${longitude}, ${latitude}`,3)
              // qqmapsdk.reverseGeocoder({
              //   location: {
              //     latitude: res.latitude,
              //     longitude: res.longitude
              //   },
              //   success: function (resc) {
              //     console.log(resc)
              //     value = resc.result.address_component.street_number //address
              //     Taro.setStorageSync('site', value)
              //     console.log('地址是：' + vlaue)
              //   }
              // })
            }
          })
        }
      }

    /**
     * 选择考勤地点
     * @param {*} e 
     */
    changeLocationPicker(e){
      let value = e.detail.value.value
      let list = this.state.locationList;
      let data = this.state.currentLocation;
      for(let i = 0 ; i < list.length; i++){
          if(value == list[i].value){
              data = list[i];
              break;
          }
      }
      let array = tools.bMapToQQMap(data.latitude, data.longitude)
    // console.log('代码百度地图坐标转换成腾讯地图坐标----->', array)
      this.setState({
          attendanceName: data.name,
          currentLocation: data,
          locationVisible: false,
          longitude: array[0],
          latitude: array[1],
      });
      this.getAddressDetail(data.longitude, data.latitude)
  }

    /**
     * 回到当前定位点
     */
    moveToLocation(){
      if(this.mapCtx){
    　this.mapCtx.moveToLocation()
      }
    }

    openPicker(e){
      this.setState({
        locationVisible: true
      })
    }

    /**
     * 确认更新考勤点
     */
    async updataAttendancePoints(e){
      if(!this.state.currentLocation.id){
        Taro.utils.showToast('请选择考勤点')
        return;
      }
      Taro.utils.showLoading()
      let params = {
        vals:{
          name: this.state.attendanceName,
          latitude: this.baiduLatitude,
          longitude: this.baiduLongitude
        },
        point_id: this.state.currentLocation.id
      }
      let res = await helperApi.updateAttendancePoints(params)
      console.log('updateAttendancePoints----->', res)
      Taro.utils.hideLoading()
      if(res.code == 0){
        Taro.utils.showToast(res.msg, 1000, 'success')
        setTimeout(() => {
          //操作成功返回上一页
          Taro.navigateBack({ delta: 1 })
        }, 1000)
      }else{
          Taro.utils.showModal(res.msg)
      }
    }

    render(){
        const { currentLocation, attendanceName } = this.state;
        let inputName = attendanceName
        return(
          this.state.init &&
          <View className="div_wrapper">
            {
              !this.state.locationVisible && !this.state.inputModalVisible &&
              <Map 
                className="location"
                id='container'
                latitude={this.state.latitude}
                longitude={this.state.longitude}
                markers={this.state.markers}
                scale={16}
                onRegionchange={this.regionchange}
                // controls={this.state.controls}
                showLocation={true}
                // onUpdated={() => console.log('11111111111---->,onUpdated')}
                // onRegionChange={() => console.log('11111111111---->,onRegionChange')}
                // onMarkerTap={() => console.log('11111111111---->,onMarkerTap')}
                // onControlTap={() => console.log('11111111111---->,onControlTap')}
                // onBegin={() => console.log('11111111111---->,onBegin')}
                // onEnd={() => console.log('11111111111---->,onEnd')}
                // onTap={() => console.log('11111111111---->,onTap')}
                > 
              </Map>
            }
            {
              !this.state.locationVisible && !this.state.inputModalVisible &&
              <CoverView className='view_header' onClick={this.openPicker.bind(this)}>
                <CoverImage src={ImageWeizi} className="icon_location"></CoverImage>
                <CoverView className='header_title'>{currentLocation.name ? currentLocation.name : '请选择考勤点'}</CoverView>
                <CoverImage src={ImageSanjiao} className="icon_sanjiao"></CoverImage>
                {/* <Text className='text_sanjiao'></Text> */}
              </CoverView>
            }
            {
              !this.state.locationVisible && !this.state.inputModalVisible &&
              <CoverView className="coverloc">
                  <CoverImage src={ImageSign} className="coverlocpng"></CoverImage>
              </CoverView>
            }
            {
              !this.state.locationVisible && !this.state.inputModalVisible && 
              <CoverView className='view_bottom'>
                <CoverImage src={ImageLocation} className="image_location" onClick={this.moveToLocation.bind(this)}></CoverImage>
                <CoverView className='view_content' style={{paddingTop: '15px'}}>
                    {
                      currentLocation.name &&
                      <CoverView className='content_line' style={{justifyContent:'space-between'}}>
                        <CoverView className='text_location'>{attendanceName}</CoverView>
                        <CoverView style={{padding:'6px',marginRight:'16px',display:'flex'}} 
                          onClick={() => this.setState({inputModalVisible: true})}>
                          <CoverView className='btn_location'>修改名称</CoverView>
                        </CoverView>
                      </CoverView>
                    }
                    <CoverView className='content_line' style={{marginTop: '6px'}}>
                      <CoverView className='view_flag'></CoverView>
                      <CoverView className='text_address'>{this.state.addressDetail}</CoverView>
                    </CoverView>
                    <CoverView className='content_line' style={{marginTop: '10px'}}>
                      <CoverView className='text_longitude'>{`经度:${Math.round(this.baiduLongitude * 1000000) / 1000000}`}</CoverView>
                      <CoverView className='text_latitude'>{`纬度:${Math.round(this.baiduLatitude * 1000000) / 1000000}`}</CoverView>
                    </CoverView>
                </CoverView>
                <CoverView className='view_btn' onClick={this.updataAttendancePoints.bind(this)}>确认更新考勤地点</CoverView>
              </CoverView>
              }
            {/* 补卡地点Picker */}
            <van-popup position='bottom' show={this.state.locationVisible}>
                <van-picker
                    columns={this.state.locationList}
                    default-index={0}
                    show-toolbar='true'
                    value-key='label'
                    onCancel={() => this.setState({ locationVisible: false })}
                    onConfirm={this.changeLocationPicker.bind(this)}
                    confirm-button-text={Taro.i18n.get('alert_ok')}
                    cancel-button-text={Taro.i18n.get('alert_cancel')}/>
            </van-popup>
            <AtModal isOpened={this.state.inputModalVisible}>
              <AtModalHeader>修改考勤点名称</AtModalHeader>
              <AtModalContent>
              <AtInput 
                type='text'
                placeholderStyle='color: #A9AEB8'
                border={true}
                placeholder={this.state.inputModalVisible ? '请输入考勤点名称' : ''}
                value={this.state.inputModalVisible ? inputName : ''}
                onChange={(e) => inputName=e}/>
              </AtModalContent>
              <AtModalAction> 
                <Button onClick={() => this.setState({ inputModalVisible: false })}>{Taro.i18n.get('alert_cancel')}</Button> 
                <Button onClick={() => {this.setState({ inputModalVisible: false,attendanceName: inputName })}}>{Taro.i18n.get('alert_ok')}</Button> 
                </AtModalAction>
            </AtModal>
          </View>
            
        
        )
    }
}