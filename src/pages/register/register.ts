import { Component, ElementRef } from '@angular/core';
import { FormControl, FormGroup,Validators } from '@angular/forms';

import {
  AlertController,
  IonicPage,
  LoadingController,
  NavController,
  NavParams
} from 'ionic-angular';

import { RegisterService } from '../../providers/register-service';
import { AppDataService } from '../../providers/app-data-service';
import { AppSettings } from '../../providers/app-settings';
/**
 * Generated class for the RegisterPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */
@IonicPage()
@Component({
  selector: 'page-register',
  templateUrl: 'register.html'
})
export class RegisterPage {
  registerForm: FormGroup = new FormGroup({
    // myContry: new FormControl('1002'),
    customerId: new FormControl({ value: '', disabled: false }),
    vcode: new FormControl({ value: '', disabled: false },Validators.required),
    password: new FormControl({ value: '', disabled: false },[Validators.minLength(3),Validators.required]),
    confirPassword: new FormControl({ value: '', disabled: false },this.validatePWD.bind(this)),
    protocolAgree: new FormControl({ value: true, disabled: false })
  });
  get form_password(){
    return this.registerForm.get("password");
  }
  validatePWD(){
    if(this.registerForm){
      const password  = this.registerForm.get("password").value;
      const confirPassword  = this.registerForm.get("confirPassword").value;
      return password!==confirPassword?{zz:"zzz"}:null
    }
  }
  // protocolAgree = false;

  toggleProtocolAgree() {
    // this.protocolAgree = !this.protocolAgree;
    const rawVal = this.registerForm.getRawValue();
    rawVal.protocolAgree = !rawVal.protocolAgree;
    this.registerForm.setValue(rawVal);
  }

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public loadingCtrl: LoadingController,
    public alertCtrl: AlertController,
    public elementRef: ElementRef,
    public registerService: RegisterService,
    public appDataService: AppDataService,
    public appSettings: AppSettings
  ) {
    const rawVal = this.registerForm.getRawValue();
    const customerId = navParams.get('customerId');
    if (customerId) {
      rawVal.customerId = customerId;
      this.registerForm.setValue(rawVal);
    }
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad RegisterPage');
  }
  registering = false;

  async init() {
    const appDataService = this.appDataService;
    try {
      await appDataService.dataReady;

      const controls = this.registerForm.controls;

      for (const prop in controls) {
        controls[prop].enable();
        if (prop in appDataService) {
          // console.log(prop, appDataService[prop]);
          controls[prop].setValue(appDataService[prop]);
        }
      }
    } catch (err) {
      console.log(err.message);
    }
  }

  sending_vcode = false;
  resend_time_clock = 0;
  _resend_time_clock_ti: any;
  tickResendTimeClock() {
    this.resend_time_clock = 60;
    clearInterval(this._resend_time_clock_ti);
    this._resend_time_clock_ti = setInterval(() => {
      this.resend_time_clock -= 1;
      if (this.resend_time_clock === 0) {
        clearInterval(this._resend_time_clock_ti);
      }
    }, 1000);
  }

  async register_step1() {
    this.sending_vcode = true;
    try {
      await this.registerService.sendSMSCode(
        this.registerForm.get('customerId').value
      );

      this.tickResendTimeClock(); // 开始倒计时重新发送短信的按钮
    } catch (err) {
      this.alertCtrl
        .create({
          title: '警告',
          message: err.message,
          buttons: ['OK']
        })
        .present();
    } finally {
      this.sending_vcode = false;
    }
  }

  async register() {
    this.registering = true;
    try {
      const controls = this.registerForm.getRawValue();

      const customerId = controls.customerId;
      const password = controls.password;
      const vcode = controls.vcode;

      await this.registerService.doRegister(customerId, vcode, password);
    } catch (err) {
      this.alertCtrl
        .create({
          title: '警告',
          message: err.message,
          buttons: ['OK']
        })
        .present();
    } finally {
      this.registering = false;
    }
  }
}