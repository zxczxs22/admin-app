import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { FirstLevelPage } from '../../app-framework/FirstLevelPage';
import { StatusBar } from '@ionic-native/status-bar';
import { asyncCtrlGenerator } from '../../app-framework/Decorator';
import { AppPageServiceProvider } from '../../providers/app-page-service/app-page-service';
import { ProductModel } from '../../providers/product-service/product-service';
import { AddressServiceProvider, AddressUse, AddressModel } from '../../providers/address-service/address-service';


/**
 * Generated class for the TabAssetPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */
@Component({
  selector: 'page-tab-asset',
  templateUrl: 'tab-asset.html',
})
export class TabAssetPage extends FirstLevelPage {
  private selectTypeIndex: number = 0;
  private selectAddressList: AddressModel[] = [];

  private typeArr = [
    {name:"充值资产"},
    {name:"提现资产"},
    {name:"矿工费资产"},
  ]


  changeType(item,i) {
    if(this.selectTypeIndex == i) return ;
    this.selectTypeIndex = i;
    return this.getAddressList();

  }
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public statusBar: StatusBar, 
    public appPageService: AppPageServiceProvider,
    public addressService: AddressServiceProvider,
  ) {
      super(navCtrl, navParams);
      
    (async() => {
      this.productList = await this.productService.productList.getPromise();
      if(this.productList.length) this.selectProduct = this.productList[0];
      this.init();
    })();
    
    
  }
 

  productList: ProductModel[] = [];
  selectProduct: ProductModel;

  @TabAssetPage.willEnter
  async pageWillEnter() {
    this.statusBar.styleLightContent();
    this.menuCtrl.enable(true, "myMenu");
    this.appPageService.on("menu@page", async path => {
      this.routeTo(path);
    }) 
    
  }

  
  init() {
    this.getAddressList();
  }
  get addressType() {
    switch(this.selectTypeIndex) {
      case 0: return AddressUse.Recharge; 
      case 1: return AddressUse.Withdraw;
      case 2: return AddressUse.Miner;
    }
  }

  @TabAssetPage.onDestory
  @TabAssetPage.willLeave
  async pageWillLeave() {
    this.menuCtrl.isOpen("myMenu") && await this.menuCtrl.close("myMenu");
    this.statusBar.styleDefault();
    this.menuCtrl.enable(false, "myMenu");
    this.appPageService.off("menu@page");
  }
  
  @asyncCtrlGenerator.loading()
  @asyncCtrlGenerator.error("获取币种列表失败")
  getAddressList() {
    return this.addressService.getAddressList(
      this.selectProduct.productHouseId,
      this.addressType,
    ).then(addressList => {
      this.selectAddressList = addressList;
    })
  }
  
  async handlerSelectProduct() {
    const _opts = {
      cssClass: "select-product",
      buttons: [],
    };
    this.productList.forEach(product => {
      _opts.buttons.push({
        text: product.productName,
        role: this.selectProduct.productName === product.productName ? "destructive" : "",
        handler: () => {
          if(this.selectProduct.productName === product.productName) return;
          this.selectProduct = product;
          this.selectTypeIndex = 0;
          this.selectAddressList = [];
          this.getAddressList();
        }
      })
    });
    _opts.buttons.push({
      text: '取消',
        role: 'cancel',
        handler: () => {
          console.log('Cancel clicked');
        }
    });
    this.actionSheetCtrl.create(_opts).present();

  }

  

  @asyncCtrlGenerator.success("地址已经成功复制到剪切板")
  @asyncCtrlGenerator.error("地址复制失败")
  copyAddress(address: string) {
    if(!navigator["clipboard"]) {
      return Promise.reject( "复制插件异常");
    }
    return navigator["clipboard"].writeText(address);
  }

  
}
