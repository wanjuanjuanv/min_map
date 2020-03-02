import Taro, { Component } from '@tarojs/taro'
import { View, Text, Textarea, Image} from '@tarojs/components'
import ImageCompany from '@/common/assets/image/ic_helper_home_company.png'
import ImageBg from '@/common/assets/image/ic_helper_home_bg.png'

import userApi from '@/common/api/user';
import helperApi from '@/common/api/helper'

import './index.scss';

export default class HelperHome extends Component {

    constructor(props){
        super(props)
        this.state={
            company_name:'',
            name:'',
            list:[],  //使用功能项
        }
    }

    componentWillMount(){
        Taro.setNavigationBarTitle({
            title: 'peoplus助手'
          })
    }

    componentDidMount(){
        this.getBaseInfo()
        this.getAssistantList()
    }

    /**
     * 读取用户user_id
     */
    async getBaseInfo(){
        let res = await userApi.getBaseInformation()
        console.log('getBaseInformation----->', res)
        if(res.code == 0){
            let data = res.data
            this.setState({
                company_name: data.company_name,
                name: data.employee_name
            })
        }else{
            Taro.utils.showModal(res.msg)
        }
    }

    /**
     * 配置功能列表
     */
    async getAssistantList(){
        Taro.utils.showLoading()
        let res = await helperApi.getAssistantList()
        console.log('getAssistantList----->', res)
        Taro.utils.hideLoading()
        if(res.code == 0){
            let data = res.data
            let list =[]
            data.forEach(element => {
                if(element.enable){
                    list.push(element)
                }
            });
            this.setState({
                list,
            })
        }else{
            Taro.utils.showModal(res.msg)
        }
    }

    onItemClick(item){
        if(item.code == 'manage_attendance_point_gps'){  //考勤点
            let platform = Taro.getStorageSync('systemInfo').platform.toLowerCase() //全部转成小写
            if(platform.indexOf('android') >=0){
                Taro.utils.navigateTo(`/pages/helper/attendance_android/index`)
            }else{
                Taro.utils.navigateTo(`/pages/helper/attendance_ios/index`)
            }
        }
    }

    logOut () {
        Taro.removeStorageSync('session_id')
        Taro.utils.reLaunch('/pages/index/index')
    }

    render(){

        const { list } = this.state

        return(
            <View className='view_wrapper'>
                <View style={{padding: '16px 8px 0px 8px'}}>
                    <Image className='view_header_image' src={ImageBg}></Image>
                </View>
                <View className='view_header'>
                    <Image className='header_image' src={ImageCompany}></Image>
                    <Text className='header_company_title'>{this.state.company_name}</Text>
                    <View className='header_item'>
                        <View className='header_line'></View>
                        <Text className='header_name'>{this.state.name}</Text>
                        <View className='header_line'></View>
                    </View>
                </View>
                <View className='view_content'>
                    {
                        list && list.length > 0 &&
                        list.map((field, index) => {
                            return(
                                <View key={`11_${index}`} className='content_item' onClick={this.onItemClick.bind(this, field)}>
                                    <View className='display_flex_row'>
                                        <View className='item_flag'></View>
                                        <Text className='item_name'>{field.name}</Text>
                                    </View>
                                    <Text className='iconfont iconnext'/>
                                </View>
                            )
                        })
                    }
                </View>
                {/* <View style={{ position: 'fixed', left: '10px', bottom: '100px' }}>
                    <Text style={{fontSize: '13px'}} onClick={this.logOut}>重新登录(测试用)</Text>
                </View> */}
            </View>
        )
    }
}