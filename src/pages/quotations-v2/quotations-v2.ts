import {
    Component,
    ViewChildren,
    ViewChild,
    ElementRef,
    Renderer,
} from "@angular/core";
// import { Slides, NavController } from 'ionic-angular';
import { NavController, Refresher, ModalController, LoadingController, Item, IonicPage, NavParams, Slides } from "ionic-angular";

import { Observable } from "rxjs/Observable";
import { BehaviorSubject } from "rxjs/BehaviorSubject";

import { QuotationDetailPage } from "../quotation-detail/quotation-detail";
import { StockDetailPage } from "../stock-detail/stock-detail";
import { SearchItemPage } from "../search-item/search-item-page";

import { RealTimeChartsComponent } from "../../components/realtime-charts/realtime-charts";
import { AppSettings } from "../../providers/app-settings";
import { SocketioService } from "../../providers/socketio-service";
import { StockDataService } from "../../providers/stock-data-service";
import { AppDataService } from "../../providers/app-data-service";
import { Subject } from "rxjs/Subject";
import { TradeInterfaceV2Page } from "../trade-interface-v2/trade-interface-v2";
import { TradeService } from "../../providers/trade-service";
import { TradeChartV2Page } from "../trade-chart-v2/trade-chart-v2";
import { Storage } from "@ionic/storage";
import { GestureLockPage } from "../gesture-lock/gesture-lock";
import { BigNumber } from "bignumber.js";

@Component({
    selector: "page-quotations-v2",
    templateUrl: "quotations-v2.html",
})
export class QuotationsPageV2 {
    @ViewChild("searchInputWrap", { read: ElementRef })
    @ViewChild("newsSlide")  newsSlide: Slides;

    searchInputWrap;
 
    activeProduct: any = "";

    searchInputValue = "";
    showSearch = false;
    private searchTermStream = new BehaviorSubject<string>("");
    search(term: string) {
        // console.log('searched');

        this.searchTermStream.next(term);
        this.activeProduct = term;
        this.mainFilter.next("");
    }

    tradeInterface: any = TradeInterfaceV2Page;

    traderList: object[] = new Array();
    traderList_show: object[] = new Array();
    tempArray = new Array(5);
    realtimeReports$: Observable<any>;

    quotationDetailPage: any = QuotationDetailPage;
    stockDetailPage: any = StockDetailPage;
    searchItemPage: any = SearchItemPage;
    stockCode: string;
    // stockCode = ['000001','000002','010001'];
    restoreTimer = null;

    useTempData: BehaviorSubject<boolean> = new BehaviorSubject(false);

    useTempData$ = this.useTempData.asObservable().distinctUntilChanged();

    tempData: BehaviorSubject<AnyObject> = new BehaviorSubject({
        latestPrice: 0,
        maxPrice: 0,
        minPrice: 0,
        yesterdayPrice: 0,
        startPrice: 0,
        turnoverQuantity: 0,
        turnoverAmount: 0,
        changeValue: 0,
        changeRate: 0,
        avgPrice: 0,
    });

    tempData$ = this.tempData.asObservable().distinctUntilChanged();

    showData: AnyObject = {};

    private _baseData$: Observable<any>;

    private _realtimeData$: Observable<any>;

    private viewDidLeave: BehaviorSubject<boolean> = new BehaviorSubject(
        undefined,
    );
    private viewDidLeave$ = this.viewDidLeave
        .asObservable()
        .distinctUntilChanged()
        .filter(value => value === true);

    private mainFilter: BehaviorSubject<string> = new BehaviorSubject(
        "ALL",
    );

    private lastRealtimeStockList: string[] = [];
    private realtimeStockList: BehaviorSubject<string[]> = new BehaviorSubject(
        [],
    );
    private realtimeStockList$ = this.realtimeStockList
        .asObservable()
        .distinctUntilChanged();

    @ViewChildren(RealTimeChartsComponent) charts;

    _thisPageActive: boolean = false;

    activeIndex: BehaviorSubject<number> = new BehaviorSubject(-1);

    realtimeOptions = {
        tooltipShow: false,
        showAxisBoundaryLabel: false,
        customTooltip: true,
        xAxisShow: false,
        axisLabelShow: false,
        // yAxisStyle: {
        // 	// color: 'rgba(255, 255, 255, 0.2)',
        // 	type: 'dashed',
        // },
        // textColor: 'rgba(255, 255, 255, 1)',
        gridLeft: "0",
        gridRight: "16px",
        gridTop: "10px",
        gridBottom: "6px",
        xAxisInside: false,
        yAxisSplitLine: false,
        // align: 'bottom',
        // yAxisSize: '10',
        area: {},
        showLineRangeColor: true,
    };
    loading:any;
    constructor(
        public navCtrl: NavController,
        public appSettings: AppSettings,
        public appDataService: AppDataService,
        public socketioService: SocketioService,
        public stockDataService: StockDataService,
        public tradeService: TradeService,
        public renderer: Renderer,
        public modalCtrl: ModalController,
        public storage: Storage,
        public loadingCtrl: LoadingController,
        public navParams: NavParams,
    ) {
       
      
        // this.changeActive(0
        this.appDataService.CHAGE_CURRENCY$.subscribe( data => {
            if(data && data.status && this.traderList.length > 0) {
                this.traderList.forEach( item => {
                    item['currencyToSymbol'] = this.appDataService.CURRENCY_INFO.currencyToSymbol;
                    if(isNaN(item['instPrice'])) {
                        item['currencyPrice'] = '--';
                    } else {
                        item['currencyPrice'] = (new BigNumber(item['instPrice'])).times(this.appDataService.CURRENCY_INFO.exchange).toString();
                    }
                });
            }
        })
    }

    // 保存上次的计时器
    private _saveLastSlide:any;
    /**
     * 轮播图移动触发函数，用于用户停止操作时，重启自动轮播
     * @param  事件
     */
    slideDrag($event) {
        if(this._saveLastSlide) {
            clearTimeout(this._saveLastSlide);
            this._saveLastSlide = null;
        }
        this._saveLastSlide = setTimeout(() => {
            // 顶部轮播图开始自动轮播
            this.newsSlide.startAutoplay()
            this._saveLastSlide = null;
        }, 4000);
    }
    ngOnInit() {
        this.loading =  this.loadingCtrl.create({
            showBackdrop: false,
            cssClass: "enableBackdropDismiss",
            dismissOnPageChange: true,
        });
        this.subscribeRealtimeReports();
        this.searchTermStream
            // .takeUntil(this.viewDidLeave$)
            .debounceTime(300)
            .distinctUntilChanged()
            .switchMap((term: string) =>
                Observable.of(term.trim().toLowerCase()),
            )
            .subscribe(str => this._filterProduct.call(this, str, true));
        this.mainFilter
            .distinctUntilChanged()
            .subscribe(str => this._filterProduct.call(this, str, false));
    }
    

    ionViewDidEnter() {
        if(this.traderList.length <= 0) {
            this.loading =  this.loadingCtrl.create({
                showBackdrop: false,
                cssClass: "enableBackdropDismiss",
                dismissOnPageChange: true,
            });
            this.ngOnInit();
        } else {
            
            this.traderList.forEach( item => {
                
                this.stockDataService.getProductStatus(item['traderId'],true)
                .then( status => {
                    if(status) {
                        item['productStatus'] = "002";
                    } else {
                        item['productStatus'] = "001";
                    }
                })
            })
        }
        if(this.loading) {
            this.loading.present({
                minClickBlockDuration: -1,
                disableApp: false, // 使得tabs依然可以点击
            });
        }
        console.log("quotations-v2 did enter");
        this.viewDidLeave.next(false);
        this.doSubscribe();
        // 延时后再设置 _thisPageActive 的值，是为了配合下面强制销毁 echarts 元素的操作。
        // 对于 echarts 元素的强制销毁，实际上并没有销毁元素本身，
        // 因此需要在 ionViewDidEnter() 触发后渲染视图时，根据 _thisPageActive = false 的条件，
        // 让模板引擎销毁 echarts 元素，
        // 然后再用延时的 _thisPageActive = true ，在一定时间后重新渲染这些元素。
        setTimeout(() => {
            this._thisPageActive = true;
            this.appDataService.getAppCoords();
        }, 200);
    }

    ionViewWillLeave() {
        // 将要离开当前页时，设置 _thisPageActive 为 false ，
        // 配合视图上的 ngIf ，让 echarts 图表被销毁，
        // 避免持续占据 cpu 资源。
        // 此处理不可以放在 onDestroy 中，因为 QuotationsPage 是 Tabs 的一级页面，
        // 切换 Tab 时不会触发 destroy 。
        // 也不能放在 ionViewDidLeave 中，因为离开页面后，视图不会重新渲染，
        // 因此需要放在 ionViewWillLeave 中。
        this._thisPageActive = false;

        // 仅仅使用 _thisPageActive 来控制 echarts 图表是否显示，是不完善的。
        // 因为如果切换 tabsPage ，并且切换的目标是一个已经显示过的页面，
        // 则 ionViewWillLeave() 与 ionViewDidLeave() 的执行间隔会非常非常短，
        // 结果导致当前视图没有重新渲染就前往了其他视图，
        // 这样 echarts 元素上的 *ngIf 就不会被触发，导致 echarts 不会被销毁，
        // 会一直占据着系统资源。
        // 目前的解决方案是 hack 方式，在离开页面 1 秒钟之后，若 echarts 元素仍然存在，
        // 就由程序将其强制销毁（元素实际上并未被销毁，只是销毁了 canvas 子元素，并调用 ngOnDestroy 方法）。
        setTimeout(() => {
            this.destoryCharts();
        }, 1e3);
    }

    ionViewDidLeave() {
        if (this.loading) {
            this.loading.dismiss();
            this.loading = null;
        }
        this.viewDidLeave.next(true);
        // realtimeStockList 的设置要放在 viewDidLeave 的设置之后，
        // 以便先触发 takeUntil() 。
        // 此处将 realtimeStockList 设置为空数组，
        // 会立刻引发退订操作。
        // 可以考虑对此使用延时，但可能需要结合 ionViewWillLeave 的 takeUntil() ，
        // 避免反复切换页面时，订阅被延时的退订冲掉。
        this.realtimeStockList.next([]);
    }

    // ionViewCanLeave() 可以返回布尔值或 Promise ，
    // 但它只对 navPush 或 navPop 等行为有效，
    // 对 TabsPage 的切换是无效的！
    // ionViewCanLeave() {
    // 	return new Promise(resolve => {
    // 		setTimeout(() => {
    // 			resolve()
    // 		}, 1000)
    // 	});
    // }

    toShowSearch() {
        this.searchInputValue = "";
        this.showSearch = true;
        this.renderer.setElementStyle(
            this.searchInputWrap.nativeElement,
            "width",
            "unset",
        );
    }

    cancelFilter() {
        this.showSearch = false;
        // this.traderList_show = this.traderList;
        if (this.searchInputValue) {
            this.activeProduct = "";
        }
        this.mainFilter.next(this.activeProduct);
        this.searchInputValue = "";
    }

    filterMainProduct(event$?: MouseEvent) {
        // console.log(event$, event$.currentTarget,event$.target)
        const target: any = event$.target as HTMLElement;
        const _target = this._findTarget(target); 
        let product;
        if (_target) {
            console.log(target);
            product = _target.id;
            
        } else {
            return void 0;
        }
        if (this.mainFilter.getValue() === product) {
            
            // this.mainFilter.next("");
            // this.activeProduct = "";
            return ;
        } else {
            this.mainFilter.next(product);
            this.activeProduct = product;
        }
    }
    /**
     * 由于MouseEvent中取到的target等类似值存在不确定性(可能是框架导致),
     * 故用递归方式寻找要修改的目标元素
     * @param el 要搜索的标签
     */
    _findTarget(el: HTMLElement): HTMLElement {
        if (!el) {
            return void 0;
        } else if (el.className.includes("product-name")) {
            return el;
        } else if (el.className.includes("item-product")) {
            return el.querySelector(".product-name");
        } else if (el.className.includes("products")) {
            return void 0;
        } else {
            return this._findTarget(el.parentElement);
        }
    }
    _filterProduct(product, search) {
        if (product) {
            product = product.trim().toLowerCase();
            this.traderList_show = this.traderList
                .filter((item: any, index, arr) => {
                    if (search) {
                        return (
                            item.traderName.toLowerCase().indexOf(product) !==
                            -1
                        );
                    } else {
                        if (
                            item.priceName.trim().toLowerCase() == product ||
                            item.productName.trim().toLowerCase() == product
                        ) {
                            return true;
                        }
                        // return item.priceName.toLowerCase().indexOf(product) !== -1
                    }
                })
                .sort((a: any, b: any) => {
                    return a.priceId - b.priceId;
                });

            this.traderList.filter((item: any, index, arr) => {
                if (search) {
                    if (item.traderName.toLowerCase().indexOf(product) !== -1) {
                        item.hidden = false;
                    } else {
                        item.hidden = true;
                    }
                    return;
                } else {
                    if (
                        item.priceName.trim().toLowerCase() == product ||
                        item.productName.trim().toLowerCase() == product || product == 'all'
                    ) {
                        item.hidden = false;
                    } else {
                        item.hidden = true;
                    }
                    return;
                }
            });
        } else {
            this.traderList_show = this.traderList;
            this.traderList.filter((item: any, index, arr) => {
                if (search) {
                    item.hidden = false;
                    return;
                } else {
                    item.hidden = false;
                    return;
                }
            });
        }
    }

    destoryCharts() {
        if (this._thisPageActive === false && this.charts) {
            // console.log(this.charts);
            for (const chart of this.charts.toArray()) {
                const chartElem = chart.chartElem
                    .nativeElement as HTMLDivElement;
                const childNodes = chartElem.childNodes;
                if (childNodes) {
                    [].forEach.call(childNodes, child => {
                        chartElem.removeChild(child);
                    });
                }
                chart.ngOnDestroy();
                // const chartComponent = chartElem.parentElement;
                // chartComponent.parentElement.removeChild(chartComponent);
            }
        }
    }

    doSubscribe() {
        // 板块行情页面应当使用行情的代码！
        // 目前使用固定的股票代码，只是用于测试，之后必须予以修正。
        const stockCode = this.stockCode;
        if (!this._baseData$) {
            this._baseData$ = this.stockDataService.stockBaseData$
                .map(data => data[stockCode])
                .do(data => console.log("_baseData$", data));
        }
        if (!this._realtimeData$) {
            this._realtimeData$ = this.stockDataService.stockRealtimeData$
                .map(data => data[stockCode])
                .do(data => console.log("_realtimeData$", data));
        }
        this.stockDataService.requestStockBaseData(stockCode).catch(() => {});

        Observable.combineLatest(
            this._baseData$,
            this.useTempData$,
            this.tempData$,
        )
            .takeUntil(this.viewDidLeave$)
            .subscribe(([baseData, useTempData, tempData]) => {
                this.showData = useTempData ? tempData : baseData;
            });
    }

    /**
     * 获取多支行情数据
     * TODO:迁移到数据中心处理
     */
    async subscribeRealtimeReports(upDate?: boolean) {
        await this.appDataService.traderListPromise;
        let srcTraderList: any;
        // const traderList = [...this.appDataService.traderList.keys()]
        const traderIdList = [];
        const traderList = [];
        if (upDate) {
            srcTraderList = (await this.tradeService.getTradeList(true)) as Map<
                string,
                AnyObject
            >;
        } else {
            srcTraderList = (this.appDataService.traderList.size
                ? this.appDataService.traderList
                : await this.tradeService.getTradeList()) as Map<
                string,
                AnyObject
            >;
        }
        srcTraderList.forEach((value, key, map) => {
            // traderList.push(value);
            // traderIdList.push(key);
            traderList[value.index] = value;
            traderIdList[value.index] = key;
            if (value.index == 0) {
                this.appDataService.LAST_TRADER.next(value);
            }
        });
        if (this.loading) {
            this.loading.dismiss();
            this.loading = null;
        }
        this.traderList = traderList;
        
        this.traderList_show = this.traderList;

        console.log("teee", this.viewDidLeave.getValue());
        this.realtimeReports$ = this.socketioService
            .subscribeRealtimeReports(traderIdList)
            .do(() => console.log("realtimeReports$ success"));
        // .takeUntil(this.viewDidLeave$)

        console.log("teee", this.realtimeReports$);

        const refCount = this.realtimeReports$
            .multicast(new Subject())
            .refCount();

        srcTraderList.forEach((value, key, map) => {
            value.reportRef = refCount
                // .takeUntil(this.viewDidLeave$)
                .filter(({ type }) => {
                    console.log("subscribeRealtimeReports success!");
                    return type === value.traderId;
                })
                .map(data => data.data)
                .map(data => {
                    //处理增量更新
                    console.log("subscribeRealtimeReports success!", data);
                    const srcArr = value.reportArr;
                    const length = srcArr.length;

                    if (length == 0) {
                        srcArr.push(...data); //使用push+解构赋值,预期echarts动画实现
                    } else {
                        srcArr.splice(
                            0,
                            Math.min(length, data.length),
                            ...data,
                        );
                    }
                    if (length > this.appSettings.Charts_Array_Length) {
                        srcArr.splice(
                            0,
                            length - this.appSettings.Charts_Array_Length,
                        );
                    }
                    return srcArr.concat();
                });
            console.log("value.traderId", value.traderId);
            console.log("value.productHouseId", value.productHouseId);
            // 行情页面
            this.stockDataService
                .subscibeRealtimeData(value.traderId, "price")
                .map(data => {
                    if(data) {
                        
                        value.currencyToSymbol = this.appDataService.CURRENCY_INFO.currencyToSymbol;
                        if(isNaN(data.instPrice)) {
                            value.currencyPrice = '--';
                            value.instPrice = '--';
                        } else {
                            value.currencyPrice = (new BigNumber(data.instPrice)).times(this.appDataService.CURRENCY_INFO.exchange).toString();
                            value.instPrice = data.instPrice;
                        }
                        
                    }
                    
                    return data;
                })
                .subscribe(value.marketRef); //, this.viewDidLeave$)
        });
    }

    switchToTempData() {
        this.useTempData.next(true);

        if (this.restoreTimer) {
            clearTimeout(this.restoreTimer);
        }

        this.restoreTimer = setTimeout(() => {
            this.useTempData.next(false);
            this.restoreTimer = null;
        }, 3e3);
    }

    async initTraderList(refresher?: Refresher) {
        if (refresher) {
            this.subscribeRealtimeReports(true)
                .then(() => {
                    if (!!this.activeProduct.trim().toLowerCase()) {
                        this._filterProduct(
                            this.activeProduct,
                            this.showSearch,
                        );
                    }
                    if (!this.appDataService.mainproducts) {
                        this.tradeService
                            .getMainProducts()
                            .then((mainproducts: AnyObject[]) => {
                                for (const product of mainproducts) {
                                    if (product.productHouseId) {
                                        console.log("mainproducts:", product);
                                        this.socketioService
                                            .subscribeHeaderPrice(
                                                product.productHouseId,
                                            )
                                            .do(data =>
                                                console.log(
                                                    "mainproducts:::?",
                                                    data,
                                                ),
                                            )
                                            .filter(
                                                data =>
                                                    data.type ===
                                                    product.productHouseId,
                                            )
                                            .map(data => data.data || data)
                                            .do(data =>
                                                console.log(
                                                    "mainproducts:::!",
                                                    data,
                                                ),
                                            )
                                            .subscribe(data => {
                                                product.symbol = data.symbol;
                                                product.price = data.price;
                                                product.range = data.range;
                                            });
                                    }
                                }
                                refresher.complete();
                            })
                            .catch(() => {
                                refresher.complete();
                            });
                    } else {
                        refresher.complete();
                    }
                })
                .catch(() => {
                    refresher.complete();
                });
        }
    }
    saveLastTrader(trader: any) {
        this.appDataService.LAST_TRADER.next(trader);
        this.gotoChart(trader);
    }
    gotoChart(trader) {
        this.navCtrl.push(TradeChartV2Page, {
            traderId: trader.traderId,
        });
    }
}
