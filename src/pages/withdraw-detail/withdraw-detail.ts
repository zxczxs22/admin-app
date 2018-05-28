import { Component, ViewChild } from "@angular/core";
import {
	IonicPage,
	NavController,
	NavParams,
	InfiniteScroll,
	ViewController,
	ModalController,
	AlertController
} from "ionic-angular";
import { SecondLevelPage } from "../../bnlc-framework/SecondLevelPage";
import { asyncCtrlGenerator } from "../../bnlc-framework/Decorator";
import { PromiseOut } from "../../bnlc-framework/providers/PromiseExtends";
import {
	AccountType,
	AccountServiceProvider,
	PaymentCategory,
	ProductModel,
	CryptoCurrencyModel,
	TransactionType,
	TransactionModel,
	DealResult,
	RateMainType,
} from "../../providers/account-service/account-service";
import { WithdrawAddressListPage } from "../withdraw-address-list/withdraw-address-list";
import { AddAddressPage } from "../add-address/add-address";
import { CommonAlert } from "../../components/common-alert/common-alert";
import { StockDataService } from "../../providers/stock-data-service";
import { PromptControlleService } from "../../providers/prompt-controlle-service";
import { PersonalDataService } from '../../providers/personal-data-service';

import { BigNumber } from "bignumber.js";

/**
 * Generated class for the WithdrawDetailPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */
@Component({
	selector: "page-withdraw-detail",
	templateUrl: "withdraw-detail.html",
})
export class WithdrawDetailPage extends SecondLevelPage {
	constructor(
		public navCtrl: NavController,
		public viewCtrl: ViewController,
		public navParams: NavParams,
		public accountService: AccountServiceProvider,
		public stockDataService: StockDataService,
		public modalCtrl: ModalController,
		public alertCtrl: AlertController,
		public promptCtrl: PromptControlleService,
		public personalDataService: PersonalDataService,
	) {

		super(navCtrl, navParams);
		BigNumber.config({ EXPONENTIAL_AT: [-8, 20] })
		this.productInfo = this.navParams.get("productInfo");
		
	}
	formData: {
		selected_withdraw_address_id: number;
		amount: string;
		password: string;
	} = {
		selected_withdraw_address_id: undefined,
		amount: "",
		password: "",
	};
	errors: any = {};
	promptLimit: any = {
		title1:'没有提现金额限制',
		title2:''
	};

	@WithdrawDetailPage.setErrorTo("errors", "amount", ["outRange"])
	checkout_amount() {
		const balance =
			parseFloat(this.access_info && this.access_info.balance) || 0;
		const amount = parseFloat(this.formData.amount) || 0;
		if (amount <= 0 || amount > balance) {
			return { outRange: true };
		}
	}
	// 产品信息
	productInfo: ProductModel;
	// 可用的提现地址列表
	withdraw_address_list: CryptoCurrencyModel[];

	@WithdrawDetailPage.watchChange(
		(self: WithdrawDetailPage, value: CryptoCurrencyModel) => {
			debugger;
			self.formData.selected_withdraw_address_id = value
				? value.id
				: undefined;
		},
	)
	selected_withdraw_address: CryptoCurrencyModel;
	access_info: any;
	openWithdrawAddressSelector() {
		const { withdraw_address_list, productInfo } = this;
		console.log('目前的   withdraw_address_list 暂时未刷新')
		console.log(withdraw_address_list)
		const selector = this.modalCtrl.create(WithdrawAddressListPage, {
			title: "提现地址管理",
			productInfo,
			selected_data:
				this.selected_withdraw_address &&
				this.selected_withdraw_address.id,
			withdraw_address_list, 
		});
		selector.onWillDismiss(data => {
			console.log("selected result:", data);
			this.selected_withdraw_address = data.selected_data;
			if (data.withdraw_address_list) {
				this.withdraw_address_list = data.withdraw_address_list;
			}
		});
		selector.present();
	}
	toAddWithdrawAddress() {
		// return this.routeTo("add-address", {
		// 	productInfo: this.productInfo,
		// });
		const selector = this.modalCtrl.create(AddAddressPage, {
			productInfo: this.productInfo,
		});
		selector.onDidDismiss(returnData => {
			this.selected_withdraw_address = returnData ? returnData : null;
			this.accountService
				.getWithdrawAddress(this.productInfo.productId)
				.then(data => {
					this.withdraw_address_list = data;
				});
		  });
		selector.present();
	}


	//取消提现订单弹出确认窗
	cancelWithdrawModal(transactionId?:string,id?:number) {
		let modal = this.alertCtrl.create({
			title: '取消订单',
			message: '确定取消这条提现订单吗？',
			buttons: [
				{
					text: '取消',
					handler: () => {
					
					}
				},
				{
					text: '确定',
					cssClass:'cancel-btn-confirm',
					handler: () => {
					this.cancelWithdrawAppply(transactionId,id)
					}
				}
			]
		});
		modal.present();
	}

	@asyncCtrlGenerator.loading()
	@asyncCtrlGenerator.error("取消失败")
	@asyncCtrlGenerator.success("取消成功")
	cancelWithdrawAppply(transactionId?:string,id?:number) {
		return this.accountService
			.cancelWithdrawAppply(
				{
					transactionId: transactionId,
					id: id,
					status: '005',
					freeze: 'true',
				}
				
			)
			.then((data) => {
				
				return  this.getTransactionLogs()

			});
	}





	//自定义弹窗(modal->alert)
	describeModal() {
		let modal = this.modalCtrl.create(CommonAlert, {
			title1: this.promptLimit.title1,
			title2: this.promptLimit.title2
		}, { showBackdrop: true, enableBackdropDismiss: true });
		modal.present();
	  }

	has_account_pwd = false;

	@WithdrawDetailPage.willEnter
	@asyncCtrlGenerator.loading()
	@asyncCtrlGenerator.error("获取交易密码信息出错")
	async checkHasAccountPWD() {
		this.has_account_pwd = await this.accountService.hasAccountPwd.getPromise();
	}

	@WithdrawDetailPage.willEnter
	@asyncCtrlGenerator.loading()
	@asyncCtrlGenerator.error("获取数据出错") 
	async getAccountsInfo() {
		this.productInfo = this.navParams.get("productInfo");
		if (this.productInfo) {
			const tasks = [];
			// 获取可用的提现地址
			tasks[tasks.length] = this.accountService
				.getWithdrawAddress(this.productInfo.productId)
				.then(data => {
					this.withdraw_address_list = data;
					if (this.selected_withdraw_address) {
						this.selected_withdraw_address = this.withdraw_address_list.find(
							wa => wa.id == this.selected_withdraw_address.id,
						);
						this.formData.selected_withdraw_address_id = this.selected_withdraw_address.id;
					}
				});
			// 获取账户信息
			tasks[tasks.length] = this.accountService
				.getAccountProduct({
					productId: this.productInfo.productId,
					accountType: AccountType.Product,
				})
				.then(data => {
					this.access_info = data;
				});
			// 获取是否有设置交易密码
			tasks[
				tasks.length
			] = this.accountService.hasAccountPwd
				.getPromise()
				.then(data => (this.has_account_pwd = data));
			// 获取提现记录
			tasks[tasks.length] = this.getTransactionLogs();
			// 获取手续费
			tasks[tasks.length] = this.accountService
				.getProductRate(this.productInfo.productId, {
					rateMainType: RateMainType.withdraw,
				})
				.then(data => {
					console.log("手续费：", data);
					this.rate_info = data[0];
					console.log(this.productInfo)
				});
			// 获取提现限额
			tasks[tasks.length] = this.accountService
				.getLimitedQuota(this.productInfo.productId,'002')
				.then(data => {

					let limitedQuota = data[0]
					//多种情况提示语
					if(limitedQuota){
						if(!limitedQuota['min'] && !limitedQuota['max']){
							this.promptLimit.title1 = '没有提现金额限制';
							this.promptLimit.title2 = '';
						}else if(limitedQuota['min'] && !limitedQuota['max']){
							this.promptLimit.title1 = '单次提现金额不得小于'+limitedQuota['min']+this.productInfo.productDetail;
							this.promptLimit.title2 = '';
						} else if(!limitedQuota['min'] && limitedQuota['max']){
							this.promptLimit.title1 = '单次提现金额不得大于'+limitedQuota['max']+this.productInfo.productDetail;
							this.promptLimit.title2 = '';
						} else{
							this.promptLimit.title1 = '单次提现金额不得小于'+limitedQuota['min']+this.productInfo.productDetail;
							this.promptLimit.title2 = '不得大于'+limitedQuota['max']+this.productInfo.productDetail;
						}
					} else {
						this.promptLimit.title1 = '没有提现金额限制';
						this.promptLimit.title2 = '';
					}
					
				});
			await Promise.all(tasks).then(() =>{
					setTimeout(() => {
						this.validateIdentify();
					}, 600);
			});
		} else {
			this.navCtrl.removeView(this.viewCtrl);
		}
	}
	rate_info: any = {};

	get canSubmit() {
		return (
			Object.keys(this.formData).every(k => this.formData[k]) &&
			!this.hasError(this.errors)
		);
	}
	@asyncCtrlGenerator.loading()
	@asyncCtrlGenerator.error("提现失败")
	@asyncCtrlGenerator.success("提现成功")
	async submitWithdrawAppply() {
		await this.personalDataService.requestCertifiedStatus();
		if(!(this.personalDataService.certifiedStatus == '101' || this.personalDataService.certifiedStatus == '2' )){
			return Promise.reject(new Error(`实名认证${this.personalDataService.realname|| this.personalDataService.certifiedMsg}`));
		}
		return this.accountService
			.submitWithdrawAppply(
				{
					transactionType: TransactionType.WithdrawProduct,
					productId: this.productInfo.productId,
					amount: new BigNumber(this.formData.amount).multipliedBy('100000000').toString(), 
					paymentId: this.formData.selected_withdraw_address_id + "",
				},
				this.formData.password,
			)
			.then((transaction: TransactionModel) => {
				return this._formatWithdrawLogs([
					transaction,
				]).then(format_transaction_list => {
					const format_transaction = format_transaction_list[0];
					this.transaction_logs.unshift(format_transaction);
					this.formData.amount = '';
					this.formData.password = '';
					
					return format_transaction;
				}).then(transaction => {
					return this.accountService
					.getAccountProduct({
						productId: this.productInfo.productId,
						accountType: AccountType.Product,
					})
					.then(data => {
						this.access_info = data;
						return transaction;
					})
				});
			});
	}

	transaction_logs: any[];

	getTransactionLogs() {
		this.withdraw_logs_page_info.page = 1;
		return this._getWithdrawLogs().then(
			data => (this.transaction_logs = data),
		);
	}
	withdraw_logs_page_info = {
		has_more: true,
		page: 1,
		page_size: 10,
	};
	has_more_withdraw_logs = true;
	@ViewChild(InfiniteScroll) infiniteScroll: InfiniteScroll;
	async loadMoreWithdrawLogs(ctrl: InfiniteScroll) {
		const { withdraw_logs_page_info } = this;
		withdraw_logs_page_info.page += 1;
		this.transaction_logs.push(...(await this._getWithdrawLogs()));
		ctrl.complete();
	}
	// @asyncCtrlGenerator.error("获取充值记录出错")
	async _getWithdrawLogs() {
		const { withdraw_logs_page_info } = this;
		const transaction_logs = await this.accountService.getWithdrawLogs({
			page: withdraw_logs_page_info.page,
			pageSize: withdraw_logs_page_info.page_size,
			targetId: this.productInfo.productId,
		});
		withdraw_logs_page_info.has_more =
			transaction_logs.length === withdraw_logs_page_info.page_size;
		this.infiniteScroll &&
			this.infiniteScroll.enable(withdraw_logs_page_info.has_more);

		return this._formatWithdrawLogs(transaction_logs);
	}

	private async _formatWithdrawLogs(transaction_logs: TransactionModel[]) {
		const formated_transaction_logs = await Promise.all(
			transaction_logs.map(async transaction => {
				const product = await this.stockDataService.getProduct(transaction.targetId);
				const withdraw_address_info = await this.accountService.getPaymentById(
					transaction.paymentId,
				);

				return Object.assign(transaction, {
					dealResultDetail: AccountServiceProvider.getTransactionStatusDetail(
						transaction.status,
					),
					productDetail: product
						? product.productDetail
							? product.productDetail
							: product.productId
						: "",
					withdrawName: withdraw_address_info
						? withdraw_address_info.paymentAccountRemark
						: "",
					withdrawAddress: withdraw_address_info
						? withdraw_address_info.paymentAccountNumber
						: "",
				});
			}),
		);
		console.log("formated_transaction_logs", formated_transaction_logs);
		return formated_transaction_logs;
	}


	//做个控制，避免回来后又弹出消息
	private validateId:boolean = true;
	validateIdentify(){
		if(this.personalDataService.certifiedStatus == '101'|| this.personalDataService.certifiedStatus == '2'  || !this.validateId ){
			return ;
		}
		let options:any = {};
		//title 不能设置在初始化中，会没掉
		if(this.personalDataService.certifiedStatus == '102'|| this.personalDataService.certifiedStatus == '104'
		|| this.personalDataService.certifiedStatus == '0'|| this.personalDataService.certifiedStatus == '3' ){
			alert['title'] = `无法提现`;
			alert['message'] = `实名认证${this.personalDataService.realname || this.personalDataService.certifiedMsg}`;
			alert['buttons'] = [
				{
					text: '取消',
					role: 'cancel',
					handler: () => {
						// console.log('Cancel clicked')
					}
				},
				{
					text: '认证',
					handler: () => {
						this.routeTo('submit-real-info').then(e =>{
							this.validateId = false;
						})
					}
				}
			];
		} 
		if(this.personalDataService.certifiedStatus == '103' || this.personalDataService.certifiedStatus == '1'){
			alert['title'] = "无法提现";
			alert['message'] = `实名认证${this.personalDataService.realname|| this.personalDataService.certifiedMsg}`;
			alert['buttons'] = [
				{
					text: '确认',
					role: 'cancel',
					handler: () => {
						// console.log('Cancel clicked')
					}
				}
			];
		}
		// 避免空白提示
		if(!(JSON.stringify(alert) == "{}")){
			this.alertCtrl.create(
				Object.assign(
					alert
				)
			).present();
		}
	}


}
