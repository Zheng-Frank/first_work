import { Component, OnInit } from "@angular/core";
import { ApiService } from "../../../services/api.service";
import { environment } from "../../../../environments/environment";
import { GlobalService } from "../../../services/global.service";
import { AlertType } from "../../../classes/alert-type";
import { zip } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { Restaurant } from '@qmenu/ui';
import { Gmb3Service } from "src/app/services/gmb3.service";
import { Helper } from "src/app/classes/helper";
import { Domain } from "src/app/classes/domain";
import * as FileSaver from 'file-saver';
@Component({
  selector: "app-db-scripts",
  templateUrl: "./db-scripts.component.html",
  styleUrls: ["./db-scripts.component.scss"]
})
export class DbScriptsComponent implements OnInit {
  removingOrphanPhones = false;
  constructor(private _api: ApiService, private _global: GlobalService, private _gmb3: Gmb3Service) { }

  ngOnInit() { }

  async trimMenu() {
    await this._api.post(environment.qmenuApiUrl + 'utils/menu', {
      name: 'trim-menu',
      payload: {}
    });
  }

  async recoverMenu() {
    // const rtId = "5edd90ee8b6849feece9e8b9";
    // const menus = [{ "hours": [{ "occurence": "WEEKLY", "fromTime": "1969-12-28T17:00:00.000Z", "toTime": "1969-12-29T03:00:00.000Z" }, { "occurence": "WEEKLY", "fromTime": "1969-12-29T17:00:00.000Z", "toTime": "1969-12-30T03:00:00.000Z" }, { "occurence": "WEEKLY", "fromTime": "1969-12-31T17:00:00.000Z", "toTime": "1970-01-01T03:00:00.000Z" }, { "occurence": "WEEKLY", "fromTime": "1970-01-01T17:00:00.000Z", "toTime": "1970-01-02T03:00:00.000Z" }, { "occurence": "WEEKLY", "fromTime": "1970-01-02T17:00:00.000Z", "toTime": "1970-01-03T03:00:00.000Z" }, { "occurence": "WEEKLY", "fromTime": "1970-01-03T17:00:00.000Z", "toTime": "1970-01-04T03:00:00.000Z" }], "mcs": [{ "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 18.49, "sizeOptions": [{ "name": "regular", "price": 18.49 }], "category": "1594448524406", "name": "霸王排骨", "inventory": null, "id": "1594448936110", "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 19.49, "sizeOptions": [{ "name": "regular", "price": 19.49 }], "category": "1594448524406", "name": "荤冒菜", "inventory": null, "id": "1594449086433", "disabled": false }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613746372864.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613746372864.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613746372864.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 13.99, "sizeOptions": [{ "name": "regular", "price": 13.99 }], "category": "1594448524406", "name": "椒盐多春鱼", "inventory": null, "id": "1598220456290", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 15.99, "sizeOptions": [{ "name": "regular", "price": 15.99 }], "category": "1594448524406", "name": "火爆双脆 hot double crispy", "inventory": null, "id": "1611017026429", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 18.99, "sizeOptions": [{ "name": "regular", "price": 18.99 }], "category": "1594448524406", "name": "干锅仔兔 dry pot bunny", "inventory": null, "id": "1611017071917", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 19.99, "sizeOptions": [{ "name": "regular", "price": 19.99 }], "category": "1594448524406", "name": "青花椒牛舌 green pepper beef tongue", "inventory": null, "id": "1611017120876", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 17.99, "sizeOptions": [{ "name": "regular", "price": 17.99 }], "category": "1594448524406", "name": "黄豆焖猪蹄 Stew pig foot with soybean", "inventory": null, "id": "1611017147193", "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 23.99, "sizeOptions": [{ "name": "regular", "price": 23.99 }], "category": "1594448524406", "name": "麻辣小龙虾 spicy cray fish", "inventory": null, "id": "1611017262961", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 19.99, "sizeOptions": [{ "name": "regular", "price": 19.99 }], "category": "1594448524406", "name": "泼妇羊蝎子 Mala lamb spine", "inventory": null, "id": "1611017314279", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.99, "sizeOptions": [{ "name": "regular", "price": 16.99 }], "category": "1594448524406", "name": "干锅千页豆腐 dry pot tofu in Chiba ", "inventory": null, "id": "1611017353156", "disabled": false }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613695076256.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613695076256.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613695076256.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 17.99, "sizeOptions": [{ "name": "regular", "price": 17.99 }], "category": "1594448524406", "name": "土豆烧排骨 potato @ baby rib", "inventory": null, "id": "1613547288708" }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613699321326.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613699321326.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613699321326.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 15.99, "sizeOptions": [{ "name": "regular", "price": 15.99 }], "category": "1594448524406", "name": "蒜苗炒腊肉. Home style dry pork", "inventory": null, "id": "1613547360086", "description": "正宗秘方四川老腊肉" }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613699714116.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613699714116.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613699714116.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 19.99, "sizeOptions": [{ "name": "regular", "price": 19.99 }], "category": "1594448524406", "name": "农家烧鸡 farmhouse roast chicken", "inventory": null, "description": "正宗纽约三黄鸡精工细作", "id": "1613699769069" }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1614235190724.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1614235190724.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1614235190724.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 20.99, "sizeOptions": [{ "name": "regular", "price": 20.99 }], "category": "1594448524406", "name": "自贡鲜锅兔 spicy bunny zigong style", "inventory": null, "id": "1614219487437", "description": "鲜锅兔，一道只有在自贡才能吃到的美味，味道鲜美、容麻辣鲜香为一体，让你吃了一次就忘不了的美食。", "disabled": false }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613746416183.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613746416183.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613746416183.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 19.99, "sizeOptions": [{ "name": "regular", "price": 19.99 }], "category": "1594448524406", "id": "16133386527610", "name": "干烧黄花鱼 Dry Roasted Yellow Croaker", "inventory": null, "disabled": true }], "name": "川菜精选Sichuan collection", "id": "1594448524406", "images": [], "disabled": true }, { "mis": [], "name": "每周特价", "id": "1617996014762", "images": [] }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 7.99, "sizeOptions": [{ "name": "regular", "price": 9.49 }], "category": "1591601142153", "id": "15916011436164", "name": "1.口水鸡 Chicken W. House Special Chili Sauce", "flavors": { "Spicy": 1 }, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 7.99, "sizeOptions": [{ "name": "regular", "price": 8.49 }], "category": "1591601142153", "id": "16126555491160", "name": "2.皮蛋豆腐Black Egg w/ Tofu", "flavors": { "Spicy": 1 } }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613746228597.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613746228597.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613746228597.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 7.99, "sizeOptions": [{ "name": "regular", "price": 9.49 }], "category": "1591601142153", "id": "15916011436168", "name": "3.夫妻肺片 Sliced Beef In Chili Sauce", "flavors": { "Spicy": 1 }, "inventory": null }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613700153070.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613700153070.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613700153070.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591601142153", "id": "15916011436163", "name": "4..东北大拉皮 Clear Noodle W. Special Sesame Sauce", "inventory": null, "disabled": false }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613700196788.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613700196788.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613700196788.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 6.99, "sizeOptions": [{ "name": "regular", "price": 7.49 }], "category": "1591601142153", "id": "16126555491161", "name": "5.伤心凉粉 Clear Noodle with Chili Sauce", "flavors": { "Spicy": 1 }, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 6.99, "sizeOptions": [{ "name": "regular", "price": 7.49 }], "category": "1591601142153", "id": "15916011436162", "name": "6.凉拌黄瓜 Cucumber Salad", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.49, "sizeOptions": [{ "name": "regular", "price": 9.49 }], "category": "1591601142153", "id": "16233907981340", "name": "7.蒜泥白肉Sliced Pork in Minced Garlic" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 8.99, "sizeOptions": [{ "name": "regular", "price": 9.49 }], "category": "1591601142153", "id": "15916011436165", "name": "8.五香牛腱spiced Beef Shank", "disabled": false, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.49, "sizeOptions": [{ "name": "regular", "price": 9.49 }], "category": "1591601142153", "id": "16233907981341", "name": "9.鸡丝荞面Cold Noodle with Chicken" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 7.99, "sizeOptions": [{ "name": "regular", "price": 8.99 }], "category": "1591601142153", "id": "16126555491162", "name": "11.红油抄手Wonton in Chili Sauce", "flavors": { "Spicy": 1 }, "inventory": null, "disabled": true }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1591757133723.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1591757133723.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1591757133723.jpeg", "origin": "CSR" }], "cachedMinCost": -1, "cachedMaxCost": 8.99, "sizeOptions": [{ "name": "regular", "price": 8.99 }], "category": "1591601142153", "id": "15916011436160", "name": "6.椒麻鸡spiced Chicken With Chili Sauce", "inventory": null, "disabled": true }], "name": "Appetizer", "id": "1591601142153", "images": [] }, { "mis": [{ "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613694950386.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613694950386.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613694950386.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 14.99, "sizeOptions": [{ "name": "regular", "price": 15.49 }], "category": "1591601240537", "id": "15916012444159", "name": "16.红烧肉 Braised Pork", "disabled": false, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 11.99, "sizeOptions": [{ "name": "regular", "price": 13.49 }], "category": "1591601240537", "id": "15916012444158", "name": "17.鱼香肉丝 Shredded Pork W.garlic Sauce", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1559079393765.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/192_menuImage/1559079393765.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1559079393765.jpeg", "origin": "IMAGE-PICKER" }], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1591601240537", "id": "15916012444153", "name": "18.回锅肉 Twice Cooked Pork", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 11.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1591601240537", "id": "15916012444156", "name": "19.农家小炒肉 Chef Special Stir Fried Pork", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 13.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1591601240537", "id": "15916012444157", "name": "20.糖醋小排 Sweets & Sour Short Ribs", "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1591601240537", "id": "15916012444154", "name": "21.锅包肉 Sweet & Sour Pork", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 13.49 }], "category": "1591601240537", "name": "22.竹笋炒肉丝 Pork Bamboo Shoot", "inventory": null, "id": "1592778103473", "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 15.99, "sizeOptions": [{ "name": "regular", "price": 16.49 }], "category": "1591601240537", "id": "16126566681930", "name": "23.干煸肥肠 Fried Spicy Intestine", "flavors": { "Spicy": 1 }, "disabled": false, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 17.49, "sizeOptions": [{ "name": "regular", "price": 16.49 }], "category": "1591601240537", "id": "16233910043840", "name": "24.溜肥肠 Spicy Pork Intestine" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.990000000000002, "sizeOptions": [{ "name": "regular", "price": 19.49 }], "category": "1591601240537", "id": "16126566681931", "name": "25. 毛血旺 Szehwan Xue Wang", "flavors": { "Spicy": 1 }, "disabled": false, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 14.99, "sizeOptions": [{ "name": "regular", "price": 14.99 }], "category": "1591601240537", "name": "排骨烧豆角 Pork Rib with Green Brans", "inventory": null, "id": "1592778070303", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.990000000000002, "sizeOptions": [{ "name": "regular", "price": 15.99 }], "category": "1591601240537", "id": "16126564240580", "name": ".京酱肉丝 Sauteed Shredded Pork w/ Bean Sauce", "disabled": true, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 15.99, "sizeOptions": [{ "name": "regular", "price": 15.99 }], "category": "1591601240537", "name": ".红烧狮子头 Braised Meat Ball", "inventory": null, "id": "1592777566978", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 12.99 }], "category": "1591601240537", "name": ".木须肉 Pork with Eggsand Fungus", "inventory": null, "id": "1592778237659", "disabled": true }], "name": "Pork", "id": "1591601240537", "images": [], "menuOptionIds": ["1592791698326"] }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 13.49 }], "category": "1591602357387", "id": "15916025152383", "name": "10.双椒鸡 Double Pepper Chicken", "flavors": { "Spicy": 1 }, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 13.49 }], "category": "1591602357387", "id": "15916025152382", "name": "11.重庆辣子鸡 Chicken W.chili Pepper", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 19.99, "sizeOptions": [{ "name": "regular", "price": 19.49 }], "category": "1591602357387", "name": "12.大盘鸡 big plate chicken", "inventory": null, "id": "1615678824187" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 13.49 }], "category": "1591602357387", "id": "15916025152381", "name": "13.宫保鸡丁 House Special Kung Pao Chicken", "flavors": { "Spicy": 1 }, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 13.49, "sizeOptions": [{ "name": "regular", "price": 13.49 }], "category": "1591602357387", "id": "15927857498021", "name": "14.孜然鸡片 Stir Fried Chicken with Cumin", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 13.49 }], "category": "1591602357387", "id": "15916025152384", "name": "15.咖喱鸡烧土豆 Curry Chicken W Roast Potatos", "disabled": false, "inventory": null, "description": "With bone" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 13.99, "sizeOptions": [{ "name": "regular", "price": 13.99 }], "category": "1591602357387", "id": "16126559296320", "name": "32.鲜椒鸡胗Pepper Gizzard", "flavors": { "Spicy": 1 }, "inventory": null, "disabled": true }, { "imageObjs": [], "cachedMinCost": 19.99, "cachedMaxCost": 19.99, "sizeOptions": [{ "name": "regular", "price": 19.99 }], "category": "1591602357387", "name": "香酥鸭 chef special crispy duck", "inventory": null, "id": "1616804038149", "disabled": true }], "name": "Chicken,duck", "id": "1591602357387", "images": [], "menuOptionIds": ["1592791698326"] }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 17.99, "sizeOptions": [{ "name": "regular", "price": 17.49 }], "category": "1591601367682", "id": "15916013694783", "name": "26.酸汤肥牛 Sour Soup with Beef", "disabled": false, "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1591601367682", "id": "15926220369777", "name": "27.咖喱牛烧土豆 Curry Beef w/ Potato", "flavors": {}, "disabled": false, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.99, "sizeOptions": [{ "name": "regular", "price": 15.49 }], "category": "1591601367682", "id": "15916013694781", "name": "28.水煮牛 Boiled Beef In Chili Sauce", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 14.99, "sizeOptions": [{ "name": "Lamb", "price": 15.49 }], "category": "1591601367682", "name": "29.孜然羊肉 Stir Fried Lamb with Cumin", "inventory": null, "id": "1592775318239", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 14.99, "sizeOptions": [{ "name": "regular", "price": 15.49 }], "category": "1591601367682", "name": "30.孜然羊肉 Stir Fried Beef with Cumin", "inventory": null, "id": "1592778322885", "disabled": false }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1591756973727.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1591756973727.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1591756973727.jpeg", "origin": "CSR" }], "cachedMinCost": -1, "cachedMaxCost": 16.99, "sizeOptions": [{ "name": "regular", "price": 16.49 }], "category": "1591601367682", "name": "31.野山椒牛肉 Pepper Shredded Beef", "inventory": null, "id": "1591713461735", "flavors": { "Spicy": 1 } }], "name": "Beef. Lamb", "id": "1591601367682", "images": [], "menuOptionIds": ["1592791698326"] }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 32.489999999999995, "sizeOptions": [{ "name": "regular", "price": 31.49 }], "category": "1591601810153", "id": "16233913777960", "name": "32.川北特色烤鱼 Chuan Bei Grill Fish" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 15.99, "sizeOptions": [{ "name": "regular", "price": 17.49 }], "category": "1591601810153", "name": "33.沸腾鱼 Boiling Sifh", "inventory": null, "id": "1592779420407", "flavors": { "Spicy": 1 } }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1591756857746.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1591756857746.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1591756857746.jpeg", "origin": "CSR" }], "cachedMinCost": -1, "cachedMaxCost": 17.99, "sizeOptions": [{ "name": "regular", "price": 17.49 }], "category": "1591601810153", "id": "15916018121305", "name": "34.川味酸菜鱼 Fish Filet with Pickled Vegetables", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.990000000000002, "sizeOptions": [{ "name": "regular", "price": 17.49 }], "category": "1591601810153", "name": "35.青花椒鱼Fish Filet with Szechuan Pepper", "inventory": null, "id": "1615679002589" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.99, "sizeOptions": [{ "name": "regular", "price": 16.49 }], "category": "1591601810153", "id": "15916018121300", "name": "36.水煮鱼 Boiled Fish In Chili Sauce", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 13.99, "sizeOptions": [{ "name": "regular", "price": 15.49 }], "category": "1591601810153", "id": "15916018121301", "name": "37.川北风暴鱼 Chuan Bei Hot Crispy Fish", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.99, "sizeOptions": [{ "name": "regular", "price": 16.49 }], "category": "1591601810153", "id": "15916018121304", "name": "38.豆花鱼boiled Fish Tofu Its Chili", "inventory": null, "disabled": false, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 15.99, "sizeOptions": [{ "name": "regular", "price": 15.99 }], "category": "1591601810153", "name": "海鲜豆腐 Braised Tofu with Seafood", "inventory": null, "id": "1592779657660", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.990000000000002, "sizeOptions": [{ "name": "regular", "price": 15.99 }], "category": "1591601810153", "id": "16126659823973", "name": "椒盐大虾Salt & Pepper Shrimp", "disabled": true, "inventory": null }], "name": "Seafood", "id": "1591601810153", "images": [], "menuOptionIds": ["1592791698326"], "disabled": false }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 17.99, "sizeOptions": [{ "name": "regular", "price": 17.49 }], "category": "1591601406249", "id": "16126568835142", "name": "39.麻辣香锅Mala Hot Pot", "description": "", "flavors": { "Spicy": 1 }, "menuOptionIds": ["1612657274526"], "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 14.99, "sizeOptions": [{ "name": "regular", "price": 16.49 }], "category": "1591601406249", "id": "15916014565592", "name": "40.干锅肥肠 Pork Intestine Fire Pot", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.490000000000002, "sizeOptions": [{ "name": "regular", "price": 15.49 }], "category": "1591601406249", "id": "16233918128730", "name": "41.香辣猪蹄 Stir Fried Pork Strotters" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 14.99, "sizeOptions": [{ "name": "regular", "price": 13.49 }], "category": "1591601406249", "id": "16126568835140", "name": "42.干锅包菜 Dry Pot Cabbage", "flavors": { "Spicy": 1 }, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 13.99, "sizeOptions": [{ "name": "regular", "price": 15.49 }], "category": "1591601406249", "id": "15916014081660", "name": "43.香辣鸡翅 Spicy Chicken Wing", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 18.49, "sizeOptions": [{ "name": "regular", "price": 17.49 }], "category": "1591601406249", "id": "16233918128731", "name": "44.干锅千页豆腐 Dry Pot Chiba Tofu" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 13.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1591601406249", "id": "15916014081661", "name": "45.干锅鸡 Griddle Cooked Chicken", "disabled": false, "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 13.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1591601406249", "name": "46.干锅鸡片 Griddle Cooked Chicken(with Meat)", "inventory": null, "id": "1592778795022", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 14.99, "sizeOptions": [{ "name": "regular", "price": 14.99 }], "category": "1591601406249", "name": "干锅排骨 Dry Pot Rib", "inventory": null, "id": "1592779017751", "disabled": true, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 29.99, "sizeOptions": [{ "name": "regular", "price": 28.99 }], "category": "1591601406249", "id": "16126568835141", "name": "川北烤鱼Chuan Bei Grill Fish", "flavors": { "Spicy": 1 }, "menuOptionIds": ["1612657274526"], "inventory": null, "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.990000000000002, "sizeOptions": [{ "name": "regular", "price": 15.99 }], "category": "1591601406249", "id": "16126568835143", "name": "冒菜 Mao Cai", "flavors": { "Spicy": 1 }, "menuOptionIds": ["1612657274526"], "inventory": null, "disabled": true }], "name": " Dry pot", "id": "1591601406249", "images": [], "menuOptionIds": ["1592791698326"] }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.99 }], "category": "1591602105661", "id": "15916021112216", "name": "47.蚂蚁上树 Sautéed Vermicelli W. Spicy Minced Pork", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.49, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "16233928806770", "name": "48.麻婆豆腐 Ma Po Tofu" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 11.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591602105661", "id": "16126582674920", "name": "49.尖椒土豆丝Pepper Potato Silk" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "15916021112213", "name": "50.手撕包菜 Sautéed Cabbage", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591602105661", "id": "15916021112212", "name": "51.蕃茄炒蛋 Tomato with egg" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 11.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "16126582674921", "name": "52.香菇菜心Mushroom and Shanghai Vegetable" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "15916021112214", "name": "53.鱼香茄子 Shredded Eggplant W. Garlic Sauce", "disabled": false, "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "159160211122110", "name": "54.干煸四季豆 Sautéed Green Bean ", "inventory": null, "description": "", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 11.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "15916021112218", "name": "55.家常豆腐 Home Style Tofu", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "15916021112210", "name": "56.地三鲜 Tripe Vegetable With Brown Sauce" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.49, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "16233928806771", "name": "57.孜然土豆片Stir Fried Potato with Cumin" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 11.49, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591602105661", "id": "16233928806772", "name": "58.韭菜炒蛋Scrambled eggs w. chinese chives" }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1591756922045.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1591756922045.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1591756922045.jpeg", "origin": "CSR" }], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "15916021112219", "name": "59.茄子豆角 Eggplant W. String Beans", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 15.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1591602105661", "name": "60.蒜苗豆苗 sauteed snow pea leaf ", "inventory": null, "id": "1617995983075" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.49, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "16233928806773", "name": "61.炒油麦菜" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.49, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "16233928806774", "name": "62.炒上海青Shanghai vegetable" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 14.49, "sizeOptions": [{ "name": "regular", "price": 13.99 }], "category": "1591602105661", "id": "15927876554403", "name": "红烧日本豆腐 Braised Japan Tofu with Vegetable", "inventory": null, "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 11.99, "sizeOptions": [{ "name": "regular", "price": 10.99 }], "category": "1591602105661", "id": "16126582674928", "name": "炒时蔬Sauteed Season Vegetable", "disabled": true, "inventory": null }], "name": "Vegetable", "id": "1591602105661", "images": [], "menuOptionIds": ["1592791698326"] }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591601766523", "id": "15916017684163", "name": "63.西湖牛肉羹 West Lake Beef Soup" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 14.49, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1591601766523", "id": "16233934013980", "name": "64.滋补蹄花汤Trotters soup" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 7.99, "sizeOptions": [{ "name": "regular", "price": 8.49 }], "category": "1591601766523", "id": "15916017684160", "name": "65.西红柿鸡蛋汤 Egg Tomato Soup", "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 7.99, "sizeOptions": [{ "name": "regular", "price": 8.49 }], "category": "1591601766523", "id": "15916017684162", "name": "66.紫菜黄瓜蛋花汤Seaweed Cucumber egg Soup" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.49, "sizeOptions": [{ "name": "regular", "price": 9.49 }], "category": "1591601766523", "id": "16233934013981", "name": "67.酸菜粉丝汤Pickled Cabbage Vermicelli Soup" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": -1, "sizeOptions": [{ "name": "small", "price": 4.49 }, { "name": "large", "price": 6.49 }], "category": "1591601766523", "id": "16233934013982", "name": "68.蛋花汤Egg Drop Soup" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.99 }], "category": "1591601766523", "id": "16126575807320", "name": "排骨海带汤Pork Rib w/ Seaweed Soup", "inventory": null, "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 12.99 }], "category": "1591601766523", "id": "15916017684161", "name": ".海鲜豆腐羹 Seafood Tofu Soup", "disabled": true, "inventory": null }], "name": "Soup", "id": "1591601766523", "images": [] }, { "mis": [{ "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613699601493.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613699601493.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613699601493.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 5.99, "sizeOptions": [{ "name": "regular", "price": 6.49 }], "category": "1591602030854", "id": "15916020330704", "name": "70.葱油饼 Scallion Pancake(3)", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.49, "sizeOptions": [{ "name": "regular", "price": 9.49 }], "category": "1591602030854", "id": "16233936585020", "name": "71.红油抄手Wonton in Chilli Sauce" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 1, "sizeOptions": [{ "name": "small", "price": 9.49 }], "category": "1591602030854", "id": "15927888159371", "name": "72.担担面 Dan Dan Noodle", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591602030854", "id": "15916020330708", "name": "73.炸酱面 noodle in soybean sauce", "disabled": false, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602030854", "id": "15916020330703", "name": "74.川味番茄牛腩面 Sichuan style tomato beef noodle", "disabled": false, "inventory": null, "description": "汤面，辣", "flavors": { "Spicy": 1 } }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1591757567414.png", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1591757567414.png", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1591757567414.png", "origin": "CSR" }], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591602030854", "id": "15916020330705", "name": "75.老成都炒饭 Old Chendu Fried Rice", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591602030854", "id": "15916020330702", "name": "76.扬州炒饭 Yang Zhou Fried Rice" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591602030854", "id": "15916020330707", "name": "77.上海炒年糕 Shanghai Rice Cake", "disabled": false, "inventory": null }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613939020590.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613939020590.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613939020590.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591602030854", "id": "16126577184360", "name": "78.猪肉白菜水饺 Pork Dumpling w. Cabbage", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591602030854", "id": "16126577184361", "name": "79.三鲜水饺Three Season Dumplings", "disabled": false, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 7.99, "sizeOptions": [{ "name": "regular", "price": 8.49 }], "category": "1591602030854", "id": "15916020330701", "name": "80.金银馒头 golden silver chinese bun(8)", "disabled": false, "inventory": null }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613699625786.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613699625786.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613699625786.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 6.99, "sizeOptions": [{ "name": "regular", "price": 5.49 }], "category": "1591602030854", "id": "15916020330706", "name": "81.芝麻球 sesame ball (4)", "disabled": false, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 7.49, "sizeOptions": [{ "name": "regular", "price": 7.49 }], "category": "1591602030854", "id": "16233936585021", "name": "82.香芋煎饼Taro Pancake(2)" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 1, "sizeOptions": [{ "name": "regular", "price": 1.7 }], "category": "1591602030854", "id": "16126580541455", "name": "83.香米饭Steamed Rice" }], "name": "Dim Sum", "id": "1591602030854", "images": [] }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 2.8, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "name": "芒果 mango lemonade ", "inventory": null, "id": "1594447670316" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 2.8, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "name": "Orange lemonade ", "inventory": null, "id": "1594447703475" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 2.8, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "name": "荔枝 lemonade ", "inventory": null, "id": "1594447749519" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 2.8, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "name": "金桔柠檬 original lemonade ", "inventory": null, "id": "1594447805590" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 2.8, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "name": "Pineapple lemonade ", "inventory": null, "id": "1594475834440" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 5.99, "sizeOptions": [{ "name": "regular", "price": 6 }], "category": "1591601535125", "id": "15916015449920", "name": "烧仙草 herb jelly", "menuOptionIds": ["1591601613532"], "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 4.99, "sizeOptions": [{ "name": "regular", "price": 5.49 }], "category": "1591601535125", "id": "15916016392140", "name": "双拼奶茶", "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.99, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "id": "15916016392141", "name": "水蜜桃奶茶", "inventory": 10, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 4.99, "sizeOptions": [{ "name": "regular", "price": 5.49 }], "category": "1591601535125", "id": "15916016392142", "name": "三兄弟 three brothers milk tea", "inventory": 27 }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.5, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "id": "15916016392144", "name": "草莓奶茶 strawberry milk tea", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.99, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "id": "15916016392145", "name": "芋香奶茶 taro milk tea", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.5, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "id": "15916016392146", "name": "红豆奶茶", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.99, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "id": "15916016392148", "name": "奥利奥奶茶 Oreo milk tea", "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.99, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "id": "159160163921412", "name": "仙草奶茶", "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.99, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "id": "159160163921413", "name": "原味奶茶 classic milk tea", "inventory": null }], "name": "Milk Tea", "id": "1591601535125", "images": [], "disabled": false }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 2.8, "sizeOptions": [{ "name": "regular", "price": 2 }], "category": "1591601917011", "name": "Mastic fruit juice", "inventory": null, "id": "1594448130940", "disabled": true }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1623415384455.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1623415384455.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1623415384455.jpeg", "origin": "CSR" }], "cachedMinCost": -1, "cachedMaxCost": 1.3, "sizeOptions": [{ "name": "regular", "price": 1 }], "category": "1591601917011", "name": "Bottle water", "inventory": null, "id": "1594448303913", "description": "" }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1601916937085.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1601916937085.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1601916937085.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 1.8, "sizeOptions": [{ "name": "regular", "price": 2.5 }], "category": "1591601917011", "name": "王老吉凉茶", "inventory": null, "id": "1594448432395" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 1.5, "sizeOptions": [{ "name": "regular", "price": 1.5 }], "category": "1591601917011", "name": "Dr Pepper", "inventory": null, "id": "1594448469467", "disabled": true }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1601916873773.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1601916873773.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1601916873773.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 2.5, "sizeOptions": [{ "name": "regular", "price": 2 }], "category": "1591601917011", "name": "Vita milk", "inventory": 15, "id": "1598220408600", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.8, "sizeOptions": [{ "name": "regular", "price": 3.8 }], "category": "1591601917011", "name": "Budweiser 百威啤酒", "inventory": null, "id": "1598724253026", "description": "We check I’d", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 1.8, "sizeOptions": [{ "name": "regular", "price": 1.8 }], "category": "1591601917011", "name": "V8 vegetable juice ", "inventory": 4, "id": "1604554409502", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.8, "sizeOptions": [{ "name": "regular", "price": 3.8 }], "category": "1591601917011", "name": "Heineken", "nonCustomizable": true, "compositions": [], "promotional": true, "inventory": null, "id": "1613542254033", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 2, "sizeOptions": [{ "name": "regular", "price": 1.88 }], "category": "1591601917011", "id": "15916019189550", "name": "冰茶 ice tea", "inventory": null, "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.8, "sizeOptions": [{ "name": "regular", "price": 3.8 }], "category": "1591601917011", "id": "15916019189551", "name": "Budlight", "disabled": true, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 4.25, "sizeOptions": [{ "name": "regular", "price": 4.25 }], "category": "1591601917011", "id": "15916019189552", "name": "Tsing Tao 青岛", "inventory": null, "description": "We check I’d", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3, "sizeOptions": [{ "name": "regular", "price": 2.5 }], "category": "1591601917011", "id": "15916019189554", "name": "椰汁 coconut juice ", "description": "16oz cup", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 4, "sizeOptions": [{ "name": "regular", "price": 4 }], "category": "1591601917011", "id": "15916019189555", "name": "Samuel Adams", "disabled": true, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 4.25, "sizeOptions": [{ "name": "regular", "price": 4.25 }], "category": "1591601917011", "id": "15916019189556", "name": "Asahi", "description": "We check I’d", "inventory": null, "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 4.25, "sizeOptions": [{ "name": "regular", "price": 4.25 }], "category": "1591601917011", "id": "15916019189557", "name": "Sapporo", "disabled": true, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 2.5, "sizeOptions": [{ "name": "regular", "price": 1.88 }], "category": "1591601917011", "id": "15916019189558", "name": "可乐 Coca-Cola ", "inventory": null, "disabled": false }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613746145890.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613746145890.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613746145890.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 2.5, "sizeOptions": [{ "name": "regular", "price": 1.88 }], "category": "1591601917011", "id": "15916019189559", "name": "健怡可乐 Diet Coke", "description": "", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 2.5, "sizeOptions": [{ "name": "regular", "price": 2.5 }], "category": "1591601917011", "id": "159160191895510", "name": "雪碧sprite", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 1.5, "sizeOptions": [{ "name": "regular", "price": 1.5 }], "category": "1591601917011", "id": "159160191895511", "name": "yeo's soybean milk", "disabled": true, "inventory": null }], "name": "Drink &Beer", "id": "1591601917011", "images": [], "disabled": false }, { "mis": [{ "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613938824707.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613938824707.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613938824707.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 4.99, "sizeOptions": [{ "name": "regular", "price": 5.49 }], "category": "1612658677867", "id": "16126586806330", "name": "96. 春卷Pork egg roll(3)", "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.99, "sizeOptions": [{ "name": "regular", "price": 4.49 }], "category": "1612658677867", "id": "16126586806331", "name": "97..素春卷spring roll(3)" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 6.99, "sizeOptions": [{ "name": "regular", "price": 7.49 }], "category": "1612658677867", "id": "16126586806332", "name": "98.蟹角 fried crabmeat Rangoon(6)" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 8.99, "sizeOptions": [{ "name": "regular", "price": 9.49 }], "category": "1612658677867", "id": "16126586806333", "name": "99.锅贴fried pot stickers(8)" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 8.99, "sizeOptions": [{ "name": "regular", "price": 9.49 }], "category": "1612658677867", "id": "16126586806334", "name": "100.蒸饺steamed pot stickers(8)" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1612658677867", "id": "161265868063312", "name": "101.鸡捞面chicken lo Mein" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1612658677867", "id": "161265868063314", "name": "102..虾捞面shrimp lo Mein" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1612658677867", "id": "161265868063313", "name": "103.牛捞面beef lo Mein" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1612658677867", "id": "161265868063316", "name": "104.蔬菜捞面vegetable lo Mein" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 12.49 }], "category": "1612658677867", "id": "161265868063315", "name": "105.综合捞面special lo Mein" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1612658677867", "id": "16126586806335", "name": "106..鸡炒饭chicken fried rice" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1612658677867", "id": "16126586806339", "name": "107.火腿炒饭ham fried rice" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1612658677867", "id": "16126586806338", "name": "108.猪炒饭pork fried rice" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1612658677867", "id": "16126586806336", "name": "109.牛炒饭beef fried rice" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1612658677867", "id": "16126586806337", "name": "110.虾炒饭shrimp fried rice" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1612658677867", "id": "161265868063311", "name": "111.蔬菜炒饭vegetable fried rice" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 12.49 }], "category": "1612658677867", "id": "161265868063310", "name": "112.综合炒饭special fried rice" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 12.49 }], "category": "1612658677867", "id": "16126588457148", "name": "113.左宗豆腐general tso's tofu" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.49, "sizeOptions": [{ "name": "regular", "price": 12.49 }], "category": "1612658677867", "id": "16233940502700", "name": "114.湖南菜Hunan Vegetable" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1612658677867", "id": "16126588457141", "name": "115.芥兰鸡chicken with broccoli" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1612658677867", "id": "161265868063317", "name": "116.左宗鸡general tso's chicken" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1612658677867", "id": "161265868063318", "name": "117.芝麻鸡sesame chicken" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1612658677867", "id": "161265868063319", "name": "118.陈皮鸡orange chicken" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1612658677867", "id": "16126588457140", "name": "119.甜酸鸡sweet & sour chicken" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1612658677867", "id": "16126588457142", "name": "120.四川鸡Szechuan chicken" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1612658677867", "id": "16126588457144", "name": "121.芥兰牛beef with broccoli" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1612658677867", "id": "16126588457145", "name": "122.蒙古牛Mongolian beef" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1612658677867", "id": "16126588457146", "name": "123.湖南牛Hunan beef" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1612658677867", "id": "16126588457147", "name": "124.芥兰虾shrimp with broccoli" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 13.99, "sizeOptions": [{ "name": "regular", "price": 15.49 }], "category": "1612658677867", "id": "16126588457149", "name": "125.全家福happy family" }], "name": "美味佳肴Perfect Taste", "id": "1612658677867", "images": [] }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 29.49, "sizeOptions": [{ "name": "regular", "price": 29.49 }], "category": "1623394801399", "id": "16233948104430", "name": "84.沸腾活鱼Boiling Fish(with bone)" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 29.49, "sizeOptions": [{ "name": "regular", "price": 29.49 }], "category": "1623394801399", "id": "16233948104431", "name": "85.成都干烧全鱼Dried Fish(with bone)" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 19.49, "sizeOptions": [{ "name": "regular", "price": 19.49 }], "category": "1623394801399", "id": "16233948104432", "name": "86.荤冒菜Mao Cai" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 19.49, "sizeOptions": [{ "name": "regular", "price": 19.49 }], "category": "1623394801399", "id": "16233948104433", "name": "87.土豆烧排骨 Potato Rib" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 20.49, "sizeOptions": [{ "name": "regular", "price": 20.49 }], "category": "1623394801399", "id": "16233948104434", "name": "88.香酥鸭（half）Chef Special Crispy Duck" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 39.49, "sizeOptions": [{ "name": "regular", "price": 39.49 }], "category": "1623394801399", "id": "16233948104435", "name": "89a.香酥鸭（whole）Chef Special Crispy Duck" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 14.49, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1623394801399", "id": "16233948104436", "name": "89.椒盐多春鱼salt pepper capelin" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 24.49, "sizeOptions": [{ "name": "regular", "price": 24.49 }], "category": "1623394801399", "id": "16233948104437", "name": "90.麻辣小龙虾spicy crayfish" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 18.49, "sizeOptions": [{ "name": "regular", "price": 18.49 }], "category": "1623394801399", "id": "16233948104438", "name": "91.血旺肥肠duck blood with pork intestine" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 21.49, "sizeOptions": [{ "name": "regular", "price": 21.49 }], "category": "1623394801399", "id": "16233948104439", "name": "92.芋儿烧鸡farmerhouse roast chicken" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 19.49, "sizeOptions": [{ "name": "regular", "price": 19.49 }], "category": "1623394801399", "id": "162339481044310", "name": "93.霸王排骨king spare rib" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 18.49, "sizeOptions": [{ "name": "regular", "price": 18.49 }], "category": "1623394801399", "id": "162339481044311", "name": "94.黄豆焖猪蹄stew pig foot with soybean" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 18.49, "sizeOptions": [{ "name": "regular", "price": 18.49 }], "category": "1623394801399", "id": "162339481044312", "name": "95.青花椒肥牛beef with sichuan pepper" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 13.49, "sizeOptions": [{ "name": "regular", "price": 13.49 }], "category": "1623394801399", "id": "162339481044313", "name": "148.韭香臊子粉chne chives with rice roodle" }], "name": "Chef Special厨师推荐", "id": "1623394801399", "images": [] }], "name": "All Day Menu", "id": "1591601137233", "nontaxable": false, "backgroundImageUrl": "https://chopst.s3.amazonaws.com/menuImage/1591602649652.jpg" }, { "hours": [{ "occurence": "WEEKLY", "fromTime": "2021-06-06T16:00:00.000Z", "toTime": "2021-06-07T02:00:00.000Z" }, { "occurence": "WEEKLY", "fromTime": "2021-06-07T16:00:00.000Z", "toTime": "2021-06-08T01:45:00.000Z" }, { "occurence": "WEEKLY", "fromTime": "2021-06-09T16:00:00.000Z", "toTime": "2021-06-10T01:45:00.000Z" }, { "occurence": "WEEKLY", "fromTime": "2021-06-10T16:00:00.000Z", "toTime": "2021-06-11T01:45:00.000Z" }, { "occurence": "WEEKLY", "fromTime": "2021-06-11T16:00:00.000Z", "toTime": "2021-06-12T02:00:00.000Z" }, { "occurence": "WEEKLY", "fromTime": "2021-06-12T16:00:00.000Z", "toTime": "2021-06-13T02:00:00.000Z" }], "mcs": [{ "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 2.8, "sizeOptions": [{ "name": "regular", "price": 2 }], "category": "1591601917011", "name": "Mastic fruit juice", "inventory": null, "id": "15944481309400", "disabled": true }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1623415384455.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1623415384455.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1623415384455.jpeg", "origin": "CSR" }], "cachedMinCost": -1, "cachedMaxCost": 1.3, "sizeOptions": [{ "name": "regular", "price": 0 }], "category": "1591601917011", "name": "Bottle water", "inventory": null, "id": "15944483039130", "description": "" }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1601916937085.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1601916937085.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1601916937085.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 1.8, "sizeOptions": [{ "name": "regular", "price": 2.5 }], "category": "1591601917011", "name": "王老吉凉茶", "inventory": null, "id": "15944484323950" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 1.5, "sizeOptions": [{ "name": "regular", "price": 1.5 }], "category": "1591601917011", "name": "Dr Pepper", "inventory": null, "id": "15944484694670", "disabled": true }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1601916873773.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1601916873773.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1601916873773.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 2.5, "sizeOptions": [{ "name": "regular", "price": 2 }], "category": "1591601917011", "name": "Vita milk", "inventory": 15, "id": "15982204086000", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.8, "sizeOptions": [{ "name": "regular", "price": 3.8 }], "category": "1591601917011", "name": "Budweiser 百威啤酒", "inventory": null, "id": "15987242530260", "description": "We check I’d", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 1.8, "sizeOptions": [{ "name": "regular", "price": 1.8 }], "category": "1591601917011", "name": "V8 vegetable juice ", "inventory": 4, "id": "16045544095020", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.8, "sizeOptions": [{ "name": "regular", "price": 3.8 }], "category": "1591601917011", "name": "Heineken", "nonCustomizable": true, "compositions": [], "promotional": true, "inventory": null, "id": "16135422540330", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 2, "sizeOptions": [{ "name": "regular", "price": 1.88 }], "category": "1591601917011", "id": "159160191895500", "name": "冰茶 ice tea", "inventory": null, "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.8, "sizeOptions": [{ "name": "regular", "price": 3.8 }], "category": "1591601917011", "id": "159160191895510", "name": "Budlight", "disabled": true, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 4.25, "sizeOptions": [{ "name": "regular", "price": 4.25 }], "category": "1591601917011", "id": "159160191895520", "name": "Tsing Tao 青岛", "inventory": null, "description": "We check I’d", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3, "sizeOptions": [{ "name": "regular", "price": 2.5 }], "category": "1591601917011", "id": "159160191895540", "name": "椰汁 coconut juice ", "description": "16oz cup", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 4, "sizeOptions": [{ "name": "regular", "price": 4 }], "category": "1591601917011", "id": "159160191895550", "name": "Samuel Adams", "disabled": true, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 4.25, "sizeOptions": [{ "name": "regular", "price": 4.25 }], "category": "1591601917011", "id": "159160191895560", "name": "Asahi", "description": "We check I’d", "inventory": null, "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 4.25, "sizeOptions": [{ "name": "regular", "price": 4.25 }], "category": "1591601917011", "id": "159160191895570", "name": "Sapporo", "disabled": true, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 2.5, "sizeOptions": [{ "name": "regular", "price": 1.88 }], "category": "1591601917011", "id": "159160191895580", "name": "可乐 Coca-Cola ", "inventory": null, "disabled": false }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613746145890.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613746145890.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613746145890.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 2.5, "sizeOptions": [{ "name": "regular", "price": 1.88 }], "category": "1591601917011", "id": "159160191895590", "name": "健怡可乐 Diet Coke", "description": "", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 2.5, "sizeOptions": [{ "name": "regular", "price": 2.5 }], "category": "1591601917011", "id": "1591601918955100", "name": "雪碧sprite", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 1.5, "sizeOptions": [{ "name": "regular", "price": 1.5 }], "category": "1591601917011", "id": "1591601918955110", "name": "yeo's soybean milk", "disabled": true, "inventory": null }], "name": "Drink &Beer", "id": "15916019170110", "images": [], "disabled": false }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 18.49, "sizeOptions": [{ "name": "regular", "price": 18.49 }], "category": "1594448524406", "name": "霸王排骨", "inventory": null, "id": "15944489361100", "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 19.49, "sizeOptions": [{ "name": "regular", "price": 19.49 }], "category": "1594448524406", "name": "荤冒菜", "inventory": null, "id": "15944490864330", "disabled": false }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613746372864.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613746372864.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613746372864.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 13.99, "sizeOptions": [{ "name": "regular", "price": 13.99 }], "category": "1594448524406", "name": "椒盐多春鱼", "inventory": null, "id": "15982204562900", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 15.99, "sizeOptions": [{ "name": "regular", "price": 15.99 }], "category": "1594448524406", "name": "火爆双脆 hot double crispy", "inventory": null, "id": "16110170264290", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 18.99, "sizeOptions": [{ "name": "regular", "price": 18.99 }], "category": "1594448524406", "name": "干锅仔兔 dry pot bunny", "inventory": null, "id": "16110170719170", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 19.99, "sizeOptions": [{ "name": "regular", "price": 19.99 }], "category": "1594448524406", "name": "青花椒牛舌 green pepper beef tongue", "inventory": null, "id": "16110171208760", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 17.99, "sizeOptions": [{ "name": "regular", "price": 17.99 }], "category": "1594448524406", "name": "黄豆焖猪蹄 Stew pig foot with soybean", "inventory": null, "id": "16110171471930", "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 23.99, "sizeOptions": [{ "name": "regular", "price": 23.99 }], "category": "1594448524406", "name": "麻辣小龙虾 spicy cray fish", "inventory": null, "id": "16110172629610", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 19.99, "sizeOptions": [{ "name": "regular", "price": 19.99 }], "category": "1594448524406", "name": "泼妇羊蝎子 Mala lamb spine", "inventory": null, "id": "16110173142790", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.99, "sizeOptions": [{ "name": "regular", "price": 16.99 }], "category": "1594448524406", "name": "干锅千页豆腐 dry pot tofu in Chiba ", "inventory": null, "id": "16110173531560", "disabled": false }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613695076256.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613695076256.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613695076256.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 17.99, "sizeOptions": [{ "name": "regular", "price": 17.99 }], "category": "1594448524406", "name": "土豆烧排骨 potato @ baby rib", "inventory": null, "id": "16135472887080" }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613699321326.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613699321326.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613699321326.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 15.99, "sizeOptions": [{ "name": "regular", "price": 15.99 }], "category": "1594448524406", "name": "蒜苗炒腊肉. Home style dry pork", "inventory": null, "id": "16135473600860", "description": "正宗秘方四川老腊肉" }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613699714116.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613699714116.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613699714116.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 19.99, "sizeOptions": [{ "name": "regular", "price": 19.99 }], "category": "1594448524406", "name": "农家烧鸡 farmhouse roast chicken", "inventory": null, "description": "正宗纽约三黄鸡精工细作", "id": "16136997690690" }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1614235190724.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1614235190724.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1614235190724.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 20.99, "sizeOptions": [{ "name": "regular", "price": 20.99 }], "category": "1594448524406", "name": "自贡鲜锅兔 spicy bunny zigong style", "inventory": null, "id": "16142194874370", "description": "鲜锅兔，一道只有在自贡才能吃到的美味，味道鲜美、容麻辣鲜香为一体，让你吃了一次就忘不了的美食。", "disabled": false }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613746416183.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613746416183.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613746416183.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 19.99, "sizeOptions": [{ "name": "regular", "price": 19.99 }], "category": "1594448524406", "id": "161333865276100", "name": "干烧黄花鱼 Dry Roasted Yellow Croaker", "inventory": null, "disabled": true }], "name": "川菜精选Sichuan collection", "id": "15944485244060", "images": [], "disabled": true }, { "mis": [], "name": "每周特价", "id": "16179960147620", "images": [] }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 7.99, "sizeOptions": [{ "name": "regular", "price": 9.49 }], "category": "1591601142153", "id": "159160114361640", "name": "1.口水鸡 Chicken W. House Special Chili Sauce", "flavors": { "Spicy": 1 }, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 7.99, "sizeOptions": [{ "name": "regular", "price": 8.49 }], "category": "1591601142153", "id": "161265554911600", "name": "2.皮蛋豆腐Black Egg w/ Tofu", "flavors": { "Spicy": 1 } }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613746228597.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613746228597.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613746228597.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 7.99, "sizeOptions": [{ "name": "regular", "price": 9.49 }], "category": "1591601142153", "id": "159160114361680", "name": "3.夫妻肺片 Sliced Beef In Chili Sauce", "flavors": { "Spicy": 1 }, "inventory": null }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613700153070.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613700153070.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613700153070.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591601142153", "id": "159160114361630", "name": "4..东北大拉皮 Clear Noodle W. Special Sesame Sauce", "inventory": null, "disabled": false }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613700196788.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613700196788.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613700196788.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 6.99, "sizeOptions": [{ "name": "regular", "price": 7.49 }], "category": "1591601142153", "id": "161265554911610", "name": "5.伤心凉粉 Clear Noodle with Chili Sauce", "flavors": { "Spicy": 1 }, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 6.99, "sizeOptions": [{ "name": "regular", "price": 7.49 }], "category": "1591601142153", "id": "159160114361620", "name": "6.凉拌黄瓜 Cucumber Salad", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.49, "sizeOptions": [{ "name": "regular", "price": 9.49 }], "category": "1591601142153", "id": "162339079813400", "name": "7.蒜泥白肉Sliced Pork in Minced Garlic" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 8.99, "sizeOptions": [{ "name": "regular", "price": 9.49 }], "category": "1591601142153", "id": "159160114361650", "name": "8.五香牛腱spiced Beef Shank", "disabled": false, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.49, "sizeOptions": [{ "name": "regular", "price": 9.49 }], "category": "1591601142153", "id": "162339079813410", "name": "9.鸡丝荞面Cold Noodle with Chicken" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 7.99, "sizeOptions": [{ "name": "regular", "price": 8.99 }], "category": "1591601142153", "id": "161265554911620", "name": "11.红油抄手Wonton in Chili Sauce", "flavors": { "Spicy": 1 }, "inventory": null, "disabled": true }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1591757133723.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1591757133723.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1591757133723.jpeg", "origin": "CSR" }], "cachedMinCost": -1, "cachedMaxCost": 8.99, "sizeOptions": [{ "name": "regular", "price": 8.99 }], "category": "1591601142153", "id": "159160114361600", "name": "6.椒麻鸡spiced Chicken With Chili Sauce", "inventory": null, "disabled": true }], "name": "Appetizer", "id": "15916011421530", "images": [] }, { "mis": [{ "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613694950386.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613694950386.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613694950386.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 14.99, "sizeOptions": [{ "name": "regular", "price": 15.49 }], "category": "1591601240537", "id": "159160124441590", "name": "16.红烧肉 Braised Pork", "disabled": false, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 11.99, "sizeOptions": [{ "name": "regular", "price": 13.49 }], "category": "1591601240537", "id": "159160124441580", "name": "17.鱼香肉丝 Shredded Pork W.garlic Sauce", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1559079393765.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/192_menuImage/1559079393765.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1559079393765.jpeg", "origin": "IMAGE-PICKER" }], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1591601240537", "id": "159160124441530", "name": "18.回锅肉 Twice Cooked Pork", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 11.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1591601240537", "id": "159160124441560", "name": "19.农家小炒肉 Chef Special Stir Fried Pork", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 13.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1591601240537", "id": "159160124441570", "name": "20.糖醋小排 Sweets & Sour Short Ribs", "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1591601240537", "id": "159160124441540", "name": "21.锅包肉 Sweet & Sour Pork", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 13.49 }], "category": "1591601240537", "name": "22.竹笋炒肉丝 Pork Bamboo Shoot", "inventory": null, "id": "15927781034730", "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 15.99, "sizeOptions": [{ "name": "regular", "price": 16.49 }], "category": "1591601240537", "id": "161265666819300", "name": "23.干煸肥肠 Fried Spicy Intestine", "flavors": { "Spicy": 1 }, "disabled": false, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 17.49, "sizeOptions": [{ "name": "regular", "price": 16.49 }], "category": "1591601240537", "id": "162339100438400", "name": "24.溜肥肠 Spicy Pork Intestine" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.990000000000002, "sizeOptions": [{ "name": "regular", "price": 19.49 }], "category": "1591601240537", "id": "161265666819310", "name": "25. 毛血旺 Szehwan Xue Wang", "flavors": { "Spicy": 1 }, "disabled": false, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 14.99, "sizeOptions": [{ "name": "regular", "price": 14.99 }], "category": "1591601240537", "name": "排骨烧豆角 Pork Rib with Green Brans", "inventory": null, "id": "15927780703030", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.990000000000002, "sizeOptions": [{ "name": "regular", "price": 15.99 }], "category": "1591601240537", "id": "161265642405800", "name": ".京酱肉丝 Sauteed Shredded Pork w/ Bean Sauce", "disabled": true, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 15.99, "sizeOptions": [{ "name": "regular", "price": 15.99 }], "category": "1591601240537", "name": ".红烧狮子头 Braised Meat Ball", "inventory": null, "id": "15927775669780", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 12.99 }], "category": "1591601240537", "name": ".木须肉 Pork with Eggsand Fungus", "inventory": null, "id": "15927782376590", "disabled": true }], "name": "Pork", "id": "15916012405370", "images": [], "menuOptionIds": ["1592791698326"] }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 13.49 }], "category": "1591602357387", "id": "159160251523830", "name": "10.双椒鸡 Double Pepper Chicken", "flavors": { "Spicy": 1 }, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 13.49 }], "category": "1591602357387", "id": "159160251523820", "name": "11.重庆辣子鸡 Chicken W.chili Pepper", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 19.99, "sizeOptions": [{ "name": "regular", "price": 19.49 }], "category": "1591602357387", "name": "12.大盘鸡 big plate chicken", "inventory": null, "id": "16156788241870" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 13.49 }], "category": "1591602357387", "id": "159160251523810", "name": "13.宫保鸡丁 House Special Kung Pao Chicken", "flavors": { "Spicy": 1 }, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 13.49, "sizeOptions": [{ "name": "regular", "price": 13.49 }], "category": "1591602357387", "id": "159278574980210", "name": "14.孜然鸡片 Stir Fried Chicken with Cumin", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 13.49 }], "category": "1591602357387", "id": "159160251523840", "name": "15.咖喱鸡烧土豆 Curry Chicken W Roast Potatos", "disabled": false, "inventory": null, "description": "With bone" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 13.99, "sizeOptions": [{ "name": "regular", "price": 13.99 }], "category": "1591602357387", "id": "161265592963200", "name": "32.鲜椒鸡胗Pepper Gizzard", "flavors": { "Spicy": 1 }, "inventory": null, "disabled": true }, { "imageObjs": [], "cachedMinCost": 19.99, "cachedMaxCost": 19.99, "sizeOptions": [{ "name": "regular", "price": 19.99 }], "category": "1591602357387", "name": "香酥鸭 chef special crispy duck", "inventory": null, "id": "16168040381490", "disabled": true }], "name": "Chicken,duck", "id": "15916023573870", "images": [], "menuOptionIds": ["1592791698326"] }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 17.99, "sizeOptions": [{ "name": "regular", "price": 17.49 }], "category": "1591601367682", "id": "159160136947830", "name": "26.酸汤肥牛 Sour Soup with Beef", "disabled": false, "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1591601367682", "id": "159262203697770", "name": "27.咖喱牛烧土豆 Curry Beef w/ Potato", "flavors": {}, "disabled": false, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.99, "sizeOptions": [{ "name": "regular", "price": 15.49 }], "category": "1591601367682", "id": "159160136947810", "name": "28.水煮牛 Boiled Beef In Chili Sauce", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 14.99, "sizeOptions": [{ "name": "Lamb", "price": 15.49 }], "category": "1591601367682", "name": "29.孜然羊肉 Stir Fried Lamb with Cumin", "inventory": null, "id": "15927753182390", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 14.99, "sizeOptions": [{ "name": "regular", "price": 15.49 }], "category": "1591601367682", "name": "30.孜然羊肉 Stir Fried Beef with Cumin", "inventory": null, "id": "15927783228850", "disabled": false }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1591756973727.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1591756973727.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1591756973727.jpeg", "origin": "CSR" }], "cachedMinCost": -1, "cachedMaxCost": 16.99, "sizeOptions": [{ "name": "regular", "price": 16.49 }], "category": "1591601367682", "name": "31.野山椒牛肉 Pepper Shredded Beef", "inventory": null, "id": "15917134617350", "flavors": { "Spicy": 1 } }], "name": "Beef. Lamb", "id": "15916013676820", "images": [], "menuOptionIds": ["1592791698326"] }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 32.489999999999995, "sizeOptions": [{ "name": "regular", "price": 31.49 }], "category": "1591601810153", "id": "162339137779600", "name": "32.川北特色烤鱼 Chuan Bei Grill Fish" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 15.99, "sizeOptions": [{ "name": "regular", "price": 17.49 }], "category": "1591601810153", "name": "33.沸腾鱼 Boiling Sifh", "inventory": null, "id": "15927794204070", "flavors": { "Spicy": 1 } }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1591756857746.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1591756857746.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1591756857746.jpeg", "origin": "CSR" }], "cachedMinCost": -1, "cachedMaxCost": 17.99, "sizeOptions": [{ "name": "regular", "price": 17.49 }], "category": "1591601810153", "id": "159160181213050", "name": "34.川味酸菜鱼 Fish Filet with Pickled Vegetables", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.990000000000002, "sizeOptions": [{ "name": "regular", "price": 17.49 }], "category": "1591601810153", "name": "35.青花椒鱼Fish Filet with Szechuan Pepper", "inventory": null, "id": "16156790025890" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.99, "sizeOptions": [{ "name": "regular", "price": 16.49 }], "category": "1591601810153", "id": "159160181213000", "name": "36.水煮鱼 Boiled Fish In Chili Sauce", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 13.99, "sizeOptions": [{ "name": "regular", "price": 15.49 }], "category": "1591601810153", "id": "159160181213010", "name": "37.川北风暴鱼 Chuan Bei Hot Crispy Fish", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.99, "sizeOptions": [{ "name": "regular", "price": 16.49 }], "category": "1591601810153", "id": "159160181213040", "name": "38.豆花鱼boiled Fish Tofu Its Chili", "inventory": null, "disabled": false, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 15.99, "sizeOptions": [{ "name": "regular", "price": 15.99 }], "category": "1591601810153", "name": "海鲜豆腐 Braised Tofu with Seafood", "inventory": null, "id": "15927796576600", "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.990000000000002, "sizeOptions": [{ "name": "regular", "price": 15.99 }], "category": "1591601810153", "id": "161266598239730", "name": "椒盐大虾Salt & Pepper Shrimp", "disabled": true, "inventory": null }], "name": "Seafood", "id": "15916018101530", "images": [], "menuOptionIds": ["1592791698326"], "disabled": false }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 17.99, "sizeOptions": [{ "name": "regular", "price": 17.49 }], "category": "1591601406249", "id": "161265688351420", "name": "39.麻辣香锅Mala Hot Pot", "description": "", "flavors": { "Spicy": 1 }, "menuOptionIds": ["1612657274526"], "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 14.99, "sizeOptions": [{ "name": "regular", "price": 16.49 }], "category": "1591601406249", "id": "159160145655920", "name": "40.干锅肥肠 Pork Intestine Fire Pot", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.490000000000002, "sizeOptions": [{ "name": "regular", "price": 15.49 }], "category": "1591601406249", "id": "162339181287300", "name": "41.香辣猪蹄 Stir Fried Pork Strotters" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 14.99, "sizeOptions": [{ "name": "regular", "price": 13.49 }], "category": "1591601406249", "id": "161265688351400", "name": "42.干锅包菜 Dry Pot Cabbage", "flavors": { "Spicy": 1 }, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 13.99, "sizeOptions": [{ "name": "regular", "price": 15.49 }], "category": "1591601406249", "id": "159160140816600", "name": "43.香辣鸡翅 Spicy Chicken Wing", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 18.49, "sizeOptions": [{ "name": "regular", "price": 17.49 }], "category": "1591601406249", "id": "162339181287310", "name": "44.干锅千页豆腐 Dry Pot Chiba Tofu" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 13.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1591601406249", "id": "159160140816610", "name": "45.干锅鸡 Griddle Cooked Chicken", "disabled": false, "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 13.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1591601406249", "name": "46.干锅鸡片 Griddle Cooked Chicken(with Meat)", "inventory": null, "id": "15927787950220", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 14.99, "sizeOptions": [{ "name": "regular", "price": 14.99 }], "category": "1591601406249", "name": "干锅排骨 Dry Pot Rib", "inventory": null, "id": "15927790177510", "disabled": true, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 29.99, "sizeOptions": [{ "name": "regular", "price": 28.99 }], "category": "1591601406249", "id": "161265688351410", "name": "川北烤鱼Chuan Bei Grill Fish", "flavors": { "Spicy": 1 }, "menuOptionIds": ["1612657274526"], "inventory": null, "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 16.990000000000002, "sizeOptions": [{ "name": "regular", "price": 15.99 }], "category": "1591601406249", "id": "161265688351430", "name": "冒菜 Mao Cai", "flavors": { "Spicy": 1 }, "menuOptionIds": ["1612657274526"], "inventory": null, "disabled": true }], "name": " Dry pot", "id": "15916014062490", "images": [], "menuOptionIds": ["1592791698326"] }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.99 }], "category": "1591602105661", "id": "159160211122160", "name": "47.蚂蚁上树 Sautéed Vermicelli W. Spicy Minced Pork", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.49, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "162339288067700", "name": "48.麻婆豆腐 Ma Po Tofu" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 11.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591602105661", "id": "161265826749200", "name": "49.尖椒土豆丝Pepper Potato Silk" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "159160211122130", "name": "50.手撕包菜 Sautéed Cabbage", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591602105661", "id": "159160211122120", "name": "51.蕃茄炒蛋 Tomato with egg" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 11.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "161265826749210", "name": "52.香菇菜心Mushroom and Shanghai Vegetable" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "159160211122140", "name": "53.鱼香茄子 Shredded Eggplant W. Garlic Sauce", "disabled": false, "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "1591602111221100", "name": "54.干煸四季豆 Sautéed Green Bean ", "inventory": null, "description": "", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 11.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "159160211122180", "name": "55.家常豆腐 Home Style Tofu", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "159160211122100", "name": "56.地三鲜 Tripe Vegetable With Brown Sauce" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.49, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "162339288067710", "name": "57.孜然土豆片Stir Fried Potato with Cumin" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 11.49, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591602105661", "id": "162339288067720", "name": "58.韭菜炒蛋Scrambled eggs w. chinese chives" }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1591756922045.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1591756922045.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1591756922045.jpeg", "origin": "CSR" }], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "159160211122190", "name": "59.茄子豆角 Eggplant W. String Beans", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 15.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1591602105661", "name": "60.蒜苗豆苗 sauteed snow pea leaf ", "inventory": null, "id": "16179959830750" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.49, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "162339288067730", "name": "61.炒油麦菜" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.49, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602105661", "id": "162339288067740", "name": "62.炒上海青Shanghai vegetable" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 14.49, "sizeOptions": [{ "name": "regular", "price": 13.99 }], "category": "1591602105661", "id": "159278765544030", "name": "红烧日本豆腐 Braised Japan Tofu with Vegetable", "inventory": null, "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 11.99, "sizeOptions": [{ "name": "regular", "price": 10.99 }], "category": "1591602105661", "id": "161265826749280", "name": "炒时蔬Sauteed Season Vegetable", "disabled": true, "inventory": null }], "name": "Vegetable", "id": "15916021056610", "images": [], "menuOptionIds": ["1592791698326"] }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591601766523", "id": "159160176841630", "name": "63.西湖牛肉羹 West Lake Beef Soup" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 14.49, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1591601766523", "id": "162339340139800", "name": "64.滋补蹄花汤Trotters soup" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 7.99, "sizeOptions": [{ "name": "regular", "price": 8.49 }], "category": "1591601766523", "id": "159160176841600", "name": "65.西红柿鸡蛋汤 Egg Tomato Soup", "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 7.99, "sizeOptions": [{ "name": "regular", "price": 8.49 }], "category": "1591601766523", "id": "159160176841620", "name": "66.紫菜黄瓜蛋花汤Seaweed Cucumber egg Soup" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.49, "sizeOptions": [{ "name": "regular", "price": 9.49 }], "category": "1591601766523", "id": "162339340139810", "name": "67.酸菜粉丝汤Pickled Cabbage Vermicelli Soup" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": -1, "sizeOptions": [{ "name": "small", "price": 4.49 }, { "name": "large", "price": 6.49 }], "category": "1591601766523", "id": "162339340139820", "name": "68.蛋花汤Egg Drop Soup" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.99 }], "category": "1591601766523", "id": "161265758073200", "name": "排骨海带汤Pork Rib w/ Seaweed Soup", "inventory": null, "disabled": true }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 12.99 }], "category": "1591601766523", "id": "159160176841610", "name": ".海鲜豆腐羹 Seafood Tofu Soup", "disabled": true, "inventory": null }], "name": "Soup", "id": "15916017665230", "images": [] }, { "mis": [{ "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613699601493.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613699601493.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613699601493.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 5.99, "sizeOptions": [{ "name": "regular", "price": 6.49 }], "category": "1591602030854", "id": "159160203307040", "name": "70.葱油饼 Scallion Pancake(3)", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.49, "sizeOptions": [{ "name": "regular", "price": 9.49 }], "category": "1591602030854", "id": "162339365850200", "name": "71.红油抄手Wonton in Chilli Sauce" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 1, "sizeOptions": [{ "name": "small", "price": 9.49 }], "category": "1591602030854", "id": "159278881593710", "name": "72.担担面 Dan Dan Noodle", "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591602030854", "id": "159160203307080", "name": "73.炸酱面 noodle in soybean sauce", "disabled": false, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1591602030854", "id": "159160203307030", "name": "74.川味番茄牛腩面 Sichuan style tomato beef noodle", "disabled": false, "inventory": null, "description": "汤面，辣", "flavors": { "Spicy": 1 } }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1591757567414.png", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1591757567414.png", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1591757567414.png", "origin": "CSR" }], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591602030854", "id": "159160203307050", "name": "75.老成都炒饭 Old Chendu Fried Rice", "inventory": null, "flavors": { "Spicy": 1 } }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591602030854", "id": "159160203307020", "name": "76.扬州炒饭 Yang Zhou Fried Rice" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591602030854", "id": "159160203307070", "name": "77.上海炒年糕 Shanghai Rice Cake", "disabled": false, "inventory": null }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613939020590.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613939020590.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613939020590.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591602030854", "id": "161265771843600", "name": "78.猪肉白菜水饺 Pork Dumpling w. Cabbage", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1591602030854", "id": "161265771843610", "name": "79.三鲜水饺Three Season Dumplings", "disabled": false, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 7.99, "sizeOptions": [{ "name": "regular", "price": 8.49 }], "category": "1591602030854", "id": "159160203307010", "name": "80.金银馒头 golden silver chinese bun(8)", "disabled": false, "inventory": null }, { "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613699625786.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613699625786.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613699625786.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 6.99, "sizeOptions": [{ "name": "regular", "price": 5.49 }], "category": "1591602030854", "id": "159160203307060", "name": "81.芝麻球 sesame ball (4)", "disabled": false, "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 7.49, "sizeOptions": [{ "name": "regular", "price": 7.49 }], "category": "1591602030854", "id": "162339365850210", "name": "82.香芋煎饼Taro Pancake(2)" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 1, "sizeOptions": [{ "name": "regular", "price": 1.7 }], "category": "1591602030854", "id": "161265805414550", "name": "83.香米饭Steamed Rice" }], "name": "Dim Sum", "id": "15916020308540", "images": [] }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 2.8, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "name": "芒果 mango lemonade ", "inventory": null, "id": "15944476703160" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 2.8, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "name": "Orange lemonade ", "inventory": null, "id": "15944477034750" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 2.8, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "name": "荔枝 lemonade ", "inventory": null, "id": "15944477495190" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 2.8, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "name": "金桔柠檬 original lemonade ", "inventory": null, "id": "15944478055900" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 2.8, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "name": "Pineapple lemonade ", "inventory": null, "id": "15944758344400" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 5.99, "sizeOptions": [{ "name": "regular", "price": 6 }], "category": "1591601535125", "id": "159160154499200", "name": "烧仙草 herb jelly", "menuOptionIds": ["1591601613532"], "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 4.99, "sizeOptions": [{ "name": "regular", "price": 5.49 }], "category": "1591601535125", "id": "159160163921400", "name": "双拼奶茶", "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.99, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "id": "159160163921410", "name": "水蜜桃奶茶", "inventory": 10, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 4.99, "sizeOptions": [{ "name": "regular", "price": 5.49 }], "category": "1591601535125", "id": "159160163921420", "name": "三兄弟 three brothers milk tea", "inventory": 27 }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.5, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "id": "159160163921440", "name": "草莓奶茶 strawberry milk tea", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.99, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "id": "159160163921450", "name": "芋香奶茶 taro milk tea", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.5, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "id": "159160163921460", "name": "红豆奶茶", "inventory": null, "disabled": false }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.99, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "id": "159160163921480", "name": "奥利奥奶茶 Oreo milk tea", "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.99, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "id": "1591601639214120", "name": "仙草奶茶", "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.99, "sizeOptions": [{ "name": "regular", "price": 4.99 }], "category": "1591601535125", "id": "1591601639214130", "name": "原味奶茶 classic milk tea", "inventory": null }], "name": "Milk Tea", "id": "15916015351250", "images": [], "disabled": false }, { "mis": [{ "imageObjs": [{ "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1613938824707.jpeg", "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1613938824707.jpeg", "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1613938824707.jpeg", "origin": "RESTAURANT" }], "cachedMinCost": -1, "cachedMaxCost": 4.99, "sizeOptions": [{ "name": "regular", "price": 5.49 }], "category": "1612658677867", "id": "161265868063300", "name": "96. 春卷Pork egg roll(3)", "inventory": null }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 3.99, "sizeOptions": [{ "name": "regular", "price": 4.49 }], "category": "1612658677867", "id": "161265868063310", "name": "97..素春卷spring roll(3)" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 6.99, "sizeOptions": [{ "name": "regular", "price": 7.49 }], "category": "1612658677867", "id": "161265868063320", "name": "98.蟹角 fried crabmeat Rangoon(6)" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 8.99, "sizeOptions": [{ "name": "regular", "price": 9.49 }], "category": "1612658677867", "id": "161265868063330", "name": "99.锅贴fried pot stickers(8)" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 8.99, "sizeOptions": [{ "name": "regular", "price": 9.49 }], "category": "1612658677867", "id": "161265868063340", "name": "100.蒸饺steamed pot stickers(8)" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1612658677867", "id": "1612658680633120", "name": "101.鸡捞面chicken lo Mein" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1612658677867", "id": "1612658680633140", "name": "102..虾捞面shrimp lo Mein" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1612658677867", "id": "1612658680633130", "name": "103.牛捞面beef lo Mein" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1612658677867", "id": "1612658680633160", "name": "104.蔬菜捞面vegetable lo Mein" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 12.49 }], "category": "1612658677867", "id": "1612658680633150", "name": "105.综合捞面special lo Mein" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1612658677867", "id": "161265868063350", "name": "106..鸡炒饭chicken fried rice" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1612658677867", "id": "161265868063390", "name": "107.火腿炒饭ham fried rice" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1612658677867", "id": "161265868063380", "name": "108.猪炒饭pork fried rice" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1612658677867", "id": "161265868063360", "name": "109.牛炒饭beef fried rice" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 9.99, "sizeOptions": [{ "name": "regular", "price": 10.49 }], "category": "1612658677867", "id": "161265868063370", "name": "110.虾炒饭shrimp fried rice" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1612658677867", "id": "1612658680633110", "name": "111.蔬菜炒饭vegetable fried rice" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 12.49 }], "category": "1612658677867", "id": "1612658680633100", "name": "112.综合炒饭special fried rice" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 12.49 }], "category": "1612658677867", "id": "161265884571480", "name": "113.左宗豆腐general tso's tofu" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.49, "sizeOptions": [{ "name": "regular", "price": 12.49 }], "category": "1612658677867", "id": "162339405027000", "name": "114.湖南菜Hunan Vegetable" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1612658677867", "id": "161265884571410", "name": "115.芥兰鸡chicken with broccoli" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1612658677867", "id": "1612658680633170", "name": "116.左宗鸡general tso's chicken" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1612658677867", "id": "1612658680633180", "name": "117.芝麻鸡sesame chicken" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1612658677867", "id": "1612658680633190", "name": "118.陈皮鸡orange chicken" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1612658677867", "id": "161265884571400", "name": "119.甜酸鸡sweet & sour chicken" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 10.99, "sizeOptions": [{ "name": "regular", "price": 11.49 }], "category": "1612658677867", "id": "161265884571420", "name": "120.四川鸡Szechuan chicken" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1612658677867", "id": "161265884571440", "name": "121.芥兰牛beef with broccoli" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1612658677867", "id": "161265884571450", "name": "122.蒙古牛Mongolian beef" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1612658677867", "id": "161265884571460", "name": "123.湖南牛Hunan beef" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 12.99, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1612658677867", "id": "161265884571470", "name": "124.芥兰虾shrimp with broccoli" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 13.99, "sizeOptions": [{ "name": "regular", "price": 15.49 }], "category": "1612658677867", "id": "161265884571490", "name": "125.全家福happy family" }], "name": "美味佳肴Perfect Taste", "id": "16126586778670", "images": [] }, { "mis": [{ "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 29.49, "sizeOptions": [{ "name": "regular", "price": 29.49 }], "category": "1623394801399", "id": "162339481044300", "name": "84.沸腾活鱼Boiling Fish(with bone)" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 29.49, "sizeOptions": [{ "name": "regular", "price": 29.49 }], "category": "1623394801399", "id": "162339481044310", "name": "85.成都干烧全鱼Dried Fish(with bone)" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 19.49, "sizeOptions": [{ "name": "regular", "price": 19.49 }], "category": "1623394801399", "id": "162339481044320", "name": "86.荤冒菜Mao Cai" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 19.49, "sizeOptions": [{ "name": "regular", "price": 19.49 }], "category": "1623394801399", "id": "162339481044330", "name": "87.土豆烧排骨 Potato Rib" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 20.49, "sizeOptions": [{ "name": "regular", "price": 20.49 }], "category": "1623394801399", "id": "162339481044340", "name": "88.香酥鸭（half）Chef Special Crispy Duck" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 39.49, "sizeOptions": [{ "name": "regular", "price": 39.49 }], "category": "1623394801399", "id": "162339481044350", "name": "89a.香酥鸭（whole）Chef Special Crispy Duck" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 14.49, "sizeOptions": [{ "name": "regular", "price": 14.49 }], "category": "1623394801399", "id": "162339481044360", "name": "89.椒盐多春鱼salt pepper capelin" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 24.49, "sizeOptions": [{ "name": "regular", "price": 24.49 }], "category": "1623394801399", "id": "162339481044370", "name": "90.麻辣小龙虾spicy crayfish" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 18.49, "sizeOptions": [{ "name": "regular", "price": 18.49 }], "category": "1623394801399", "id": "162339481044380", "name": "91.血旺肥肠duck blood with pork intestine" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 21.49, "sizeOptions": [{ "name": "regular", "price": 21.49 }], "category": "1623394801399", "id": "162339481044390", "name": "92.芋儿烧鸡farmerhouse roast chicken" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 19.49, "sizeOptions": [{ "name": "regular", "price": 19.49 }], "category": "1623394801399", "id": "1623394810443100", "name": "93.霸王排骨king spare rib" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 18.49, "sizeOptions": [{ "name": "regular", "price": 18.49 }], "category": "1623394801399", "id": "1623394810443110", "name": "94.黄豆焖猪蹄stew pig foot with soybean" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 18.49, "sizeOptions": [{ "name": "regular", "price": 18.49 }], "category": "1623394801399", "id": "1623394810443120", "name": "95.青花椒肥牛beef with sichuan pepper" }, { "imageObjs": [], "cachedMinCost": -1, "cachedMaxCost": 13.49, "sizeOptions": [{ "name": "regular", "price": 13.49 }], "category": "1623394801399", "id": "1623394810443130", "name": "148.韭香臊子粉chne chives with rice roodle" }], "name": "Chef Special厨师推荐", "id": "16233948013990", "images": [] }], "name": "All Day Menu (Dine-in)", "nontaxable": false, "backgroundImageUrl": "https://chopst.s3.amazonaws.com/menuImage/1591602649652.jpg", "id": "1623415671167", "targetCustomer": "DINE_IN_ONLY" }, { "hours": [{ "occurence": "WEEKLY", "fromTime": "1969-12-28T17:00:00.000Z", "toTime": "1969-12-29T03:00:00.000Z" }, { "occurence": "WEEKLY", "fromTime": "1969-12-29T17:00:00.000Z", "toTime": "1969-12-30T02:45:00.000Z" }, { "occurence": "WEEKLY", "fromTime": "1969-12-31T17:00:00.000Z", "toTime": "1970-01-01T02:45:00.000Z" }, { "occurence": "WEEKLY", "fromTime": "1970-01-01T17:00:00.000Z", "toTime": "1970-01-02T02:45:00.000Z" }, { "occurence": "WEEKLY", "fromTime": "1970-01-02T17:00:00.000Z", "toTime": "1970-01-03T03:00:00.000Z" }, { "occurence": "WEEKLY", "fromTime": "1970-01-03T17:00:00.000Z", "toTime": "1970-01-04T03:00:00.000Z" }], "mcs": [], "name": "Qr menu (dine in only)", "description": "For dine in only", "id": "1617397632883", "disabled": true }];
    // await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
    //   old: { _id: rtId },
    //   new: { _id: rtId, menus: menus }
    // }]).toPromise();
  }

  async findNonUsedMis() {
    const rtId = '5a950e6fa5c27b1400a58830'
    const [rt] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { _id: { $oid: rtId } },
      projection: {
        name: 1,
        'menus.mcs.mis.name': 1
      },
      limit: 1
    }).toPromise();
    const latestOrders = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      query: { restaurant: { $oid: rtId } },
      projection: {
        'orderItems.miInstance.name': 1
      },
      sort: {
        createdAt: -1
      },
      limit: 2000
    }).toPromise();
    const map = {};
    rt.menus.map(menu => menu.mcs.map(mc => mc.mis.map(mi => map[mi.name] = 0)));
    latestOrders.map(o => o.orderItems.map(oi => {
      map[oi.miInstance.name] = (map[oi.miInstance.name] || 0) + 1;
    }));
    const sorted = Object.keys(map).map(k => ({ name: k, value: map[k], percent: 0 })).sort((a1, a2) => a2.value - a1.value);
    const total = sorted.reduce((sum, i) => sum + i.value, 0);
    let subtotal = 0;
    for (let i = 0; i < sorted.length; i++) {
      subtotal += sorted[i].value;
      sorted[i].percent = subtotal / total;
    }
    console.log(sorted);
    console.log('test')
  }

  async fixMenuDuplication() {

    const allRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {},
      projection: {
        name: 1,
      },
      limit: 10000000
    }).toPromise();

    const restaurantIds = allRestaurants.map(r => r._id);
    const badIds = [];

    const batchSize = 50;
    const batches = Array(Math.ceil(restaurantIds.length / batchSize)).fill(0).map((i, index) => restaurantIds.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batches) {
      console.log("batch ", batches.indexOf(batch), ' of ', batches.length);
      try {
        const query = {
          _id: { $in: [...batch.map(id => ({ $oid: id }))] }
        };
        const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'restaurant',
          query,
          projection: {
            menus: 1,
            name: 1,
          },
          limit: batchSize + 1
        }).toPromise();

        console.log("Done request");

        for (let r of restaurants) {
          const menus = r.menus || [];
          let updated = false;
          // we remove EITHER duplicared id or duplicated name of menu items!
          for (let i = menus.length - 1; i >= 0; i--) {
            const menu = menus[i];
            const mcs = menu.mcs || [];
            for (let j = mcs.length - 1; j >= 0; j--) {
              const mc = mcs[j];
              const mis = mc.mis || [];
              const miIds = new Set();
              const miNames = new Set();
              for (let k = mis.length - 1; k >= 0; k--) {
                const mi = mis[k] || {};
                if (miIds.has(mi.id) /*|| miNames.has(mi.name) */) {
                  console.log('dup:', mi.name, mi.sizeOptions[0].price);
                  updated = true;
                  mis.splice(k, 1);
                }
                miIds.add(mi.id);
                miNames.add(mi.name);
              }
            }
          }

          if (updated) {
            console.log(r.name)
            // write it back
            await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
              old: { _id: r._id },
              new: { _id: r._id, menus: menus }
            }]).toPromise();
          }
          console.log('done updating batch')
        }
      } catch (error) {
        console.log(error);
        badIds.push(...batch);
      }
      console.log("batch done");
    }
    console.log(badIds);
  }

  async fixMenuSortOrders() {
    // const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
    //   resource: 'restaurant',
    //   query: {
    //     $or: [
    //       { "menu.mc.sortOrder": { $exists: true } },
    //       { "menu.mc.mis.sortOrder": { $exists: true } }
    //     ]
    //   },
    //   projection: {
    //     menus: 1,
    //     name: 1
    //   },
    // }, 10);
    while (true) {

      const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: {
          $or: [
            { "menus.mcs.sortOrder": { $exists: true } },
            { "menus.mcs.mis.sortOrder": { $exists: true } }
          ]
        },
        projection: {
          menus: 1,
          name: 1,
        },
        limit: 20
      }).toPromise();

      if (restaurants.length === 0) {
        console.log("all done");
        break;
      }

      console.log(restaurants.map(r => r.name));
      // a local function to sort arr based on sortOrder.
      const sort = function (arr) {
        let firstPart = arr.filter((i) => i && typeof i.sortOrder === 'number');
        let secondPart = arr.filter((i) => i && typeof i.sortOrder !== 'number');
        firstPart = firstPart.sort((a, b) => a.sortOrder - b.sortOrder);
        return firstPart.concat(secondPart);
      }

      for (let r of restaurants) {
        const menus = r.menus || [];
        const hasSortOrder = menus.some(menu => (menu.mcs || []).some(mc => (mc && mc.hasOwnProperty('sortOrder')) || (mc.mis || []).some(mi => (mi && mi.hasOwnProperty('sortOrder')))));
        console.log(hasSortOrder);
        if (hasSortOrder) {
          // sort it and then remove sortOrder and rewrite back
          menus.map(menu => {
            (menu.mcs || []).map(mc => {
              mc.mis = sort(mc.mis || []);
              mc.mis.map(mi => delete mi.sortOrder);
            });
            // sort mcs
            menu.mcs = sort(menu.mcs);
            menu.mcs.map(mc => delete mc.sortOrder);
          });
          // write it back
          await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
            old: { _id: r._id },
            new: { _id: r._id, menus: menus }
          }]).toPromise();
        }
      }
    }

  }


  async fixBadMenuHours() {
    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        "menus.hours": 1,
        name: 1
      },
    }, 3000);
    for (let r of restaurants) {
      const hasBadHours = (r.menus || []).some(menu => !Array.isArray(menu.hours || []) || (menu.hours || []).some(hour => !hour || !hour.fromTime || !hour.toTime /*|| !hour.occurence */));
      if (hasBadHours) {
        console.log(r);
      }
    }
  }

  async getMostUsedPhones() {
    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        "channels.value": 1,
        "channels.type": 1,
        "channels.notifications": 1,
        disabled: 1,
        name: 1,
        score: 1
      },
    }, 1000000);
    const valueRts = {};
    restaurants.map(rt => {
      if (!rt.disabled) {
        (rt.channels || []).map(c => {
          valueRts[c.value] = valueRts[c.value] || []
          valueRts[c.value].push(rt);
        });
      }
    });
    const sortedEntries = Object.entries(valueRts).sort((e2, e1) => e1[1]["length"] - e2[1]["length"]);
    console.log(sortedEntries);

    const getCostScore = function (rt) {
      let score = 0;
      (rt.channels || []).filter(c => (c.notifications || []).indexOf("Order") >= 0).map(c => {
        switch (c.type) {
          case "SMS":
            score += 1;
            break;
          case "Voice":
          case "Fax":
            score += 2;
            break;
          default:
            break;
        }
      });
      return score;

    }
    const withMostPhones = restaurants.filter(rt => !rt.disabled).sort((r2, r1) => getCostScore(r1) - getCostScore(r2));
    console.log(withMostPhones);
  }


  async migrateBlacklist() {
    const bannedCustomers = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'customer',
      query: { bannedReasons: { $exists: 1 } },
      projection: {
        email: 1,
        socialId: 1,
        phone: 1,
        bannedReasons: 1
      },
    }, 1000000);
    console.log(bannedCustomers);

    const existingBlacklist = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'blacklist',
      projection: {
        type: 1,
        value: 1,
        disabled: 1
      }
    }, 1000000)

    // get unique delivery addresses of abount 3000 customers!
    const batchSize = 100;

    const batchedCustomers = Array(Math.ceil(bannedCustomers.length / batchSize)).fill(0).map((i, index) => bannedCustomers.slice(index * batchSize, (index + 1) * batchSize));
    const customerOrders = {};
    const orders = [];
    for (let customers of batchedCustomers) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'order',
        query: {
          type: 'DELIVERY',
          "customerObj._id": { $in: customers.map(c => c._id) }
        },
        projection: {
          "paymentObj.method": 1,
          type: 1,
          "restaurantObj._id": 1,
          "restaurantObj.name": 1,
          "customerObj._id": 1,
          "address.formatted_address": 1,
          "address.lat": 1,
          "address.lng": 1
        },
        limit: 1000000
      }).toPromise();
      orders.push(...batch);
      batch.map(order => {
        customerOrders[order.customerObj._id] = customerOrders[order.customerObj._id] || [];
        customerOrders[order.customerObj._id].push(order);
      });
    }

    // for each banned customer, let's put his phone, email, socialId, address (from his delivery orders) to the system
    const generatedBlacklist = {}; // value: item
    bannedCustomers.map(customer => {
      generatedBlacklist[customer._id] = {
        type: 'CUSTOMER',
        value: customer._id,
        orders: customerOrders[customer._id] || [],
        reasons: customer.bannedReasons
      };

      if (customer.phone) {
        generatedBlacklist[customer.phone] = {
          type: 'PHONE',
          value: customer.phone,
          orders: customerOrders[customer._id] || [],
          reasons: customer.bannedReasons
        };
      }
      if (customer.email) {
        generatedBlacklist[customer.email] = {
          type: 'EMAIL',
          value: customer.email,
          orders: customerOrders[customer._id] || [],
          reasons: customer.bannedReasons
        };
      }
      if (customer.socialId) {
        generatedBlacklist[customer.socialId] = {
          type: 'SOCIAL',
          value: customer.socialId,
          orders: customerOrders[customer._id] || [],
          reasons: customer.bannedReasons
        };
      }

      for (let order of customerOrders[customer._id] || []) {
        if (order.address && order.address.formatted_address) {
          generatedBlacklist[order.address.formatted_address] = {
            type: 'ADDRESS',
            value: order.address.formatted_address,
            orders: orders.filter(o => o.address && order.address.formatted_address === o.address.formatted_address),
            reasons: customer.bannedReasons
          };
        }
      }
    });

    console.log(Object.keys(generatedBlacklist).length);
    const newBlacklist = Object.keys(generatedBlacklist).filter(key => !existingBlacklist.some(eb => key === eb.value));
    console.log(newBlacklist.length);
    console.log(existingBlacklist.length);
    // put those new list!
    if (newBlacklist.length > 0) {
      await this._api.post(environment.appApiUrl + `app`, {
        resource: "blacklist",
        objects: newBlacklist.map(key => generatedBlacklist[key])
      }).toPromise();
    }
    console.log(`new items count = ${newBlacklist.length}`);
  }

  async calculateCommissions() {
    // get all non-canceled, payment completed invoices so far
    const invoicesRaw = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "invoice",
      query: {},
      projection: {
        isCanceled: 1,
        commission: 1,
        isPaymentCompleted: 1,
        toDate: 1,
        total: 1
      }
    }, 20000);
    // remove bad ones
    const invoices = invoicesRaw.filter(i => i.total < 100000);

    // all
    const allCommissions = invoices.reduce((sum, invoice) => {
      if (!invoice.isCanceled) {
        return sum + (invoice.commission || 0);
      }

      return sum;
    }, 0);
    const allTotal = invoices.reduce((sum, invoice) => {
      if (!invoice.isCanceled) {
        return sum + (invoice.total || 0);
      }

      return sum;
    }, 0);

    // year so far
    const year = new Date().getFullYear() - 0;

    const yearCommission = invoices.reduce((sum, invoice) => {
      if (!invoice.isCanceled && new Date(invoice.toDate).getFullYear() === year) {
        return sum + (invoice.commission || 0);
      }
      return sum;
    }, 0);

    const yearTotal = invoices.reduce((sum, invoice) => {
      if (!invoice.isCanceled && new Date(invoice.toDate).getFullYear() === year) {
        return sum + (invoice.total || 0);
      }
      return sum;
    }, 0);

    // year rolling

    const lastYear = new Date();
    lastYear.setDate(lastYear.getDate() - 366);

    const yearOverYearCommission = invoices.reduce((sum, invoice) => {
      if (!invoice.isCanceled && new Date(invoice.toDate).valueOf() > lastYear.valueOf()) {
        return sum + (invoice.commission || 0);
      }
      return sum;
    }, 0);

    const yearOverYearTotal = invoices.reduce((sum, invoice) => {
      if (!invoice.isCanceled && new Date(invoice.toDate).valueOf() > lastYear.valueOf()) {
        return sum + (invoice.total || 0);
      }
      return sum;
    }, 0);

    console.log(`Life Total: ${allTotal}`);
    console.log(`Life Comissions: ${allCommissions}`);
    console.log(`Year Total: ${yearTotal}`);
    console.log(`Year Comissions: ${yearCommission}`);
    console.log(`YoY Total: ${yearOverYearTotal}`);
    console.log(`YoY Comissions: ${yearOverYearCommission}`);
  }

  async fixSalesBaseAndBonus() {
    const newOwnershipRts = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "previousRestaurantId": { $ne: null },
      },
      projection: {
        previousRestaurantId: 1,
        rateSchedules: 1,
        name: 1
      },
      limit: 10000000
    }).toPromise();
    console.log(newOwnershipRts);
    const nonNoneAgentRts = newOwnershipRts.filter(rt => (rt.rateSchedules || []).some(rs => (rs.agent || '').toLowerCase() !== 'none'));
    console.log(nonNoneAgentRts);
    alert("not finished coding")
  }

  async mutateRtId() {
    // 1. create a copy of old restaurant (manual)
    // 2. note down the ID of the new RT
    // 3. run the script to migrate everythings: orders, invoices, tasks, ?????
    // 4. delete the old restaurant (manual)

    const newId = '5da35ab7e7179a02244c016e';
    const oldId = '5d9dee267c213e55613c6251';

    const orders = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'order',
      query: {
        "restaurant": { $oid: oldId },
      },
      projection: {
        createdAt: 1,
        restaurant: 1,
        restaurantObj: 1
      },
      limit: 10000000
    }).toPromise();

    console.log(orders);
    const patches = orders.map(order => ({
      old: {
        _id: order._id,
        restaurantObj: {}
      },
      new: {
        _id: order._id,
        restaurant: { $oid: newId },
        restaurantObj: {
          _id: newId
        }
      }
    }));

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=order', patches).toPromise();

    const invoices = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'invoice',
      query: {
        "restaurant.id": oldId,
      },
      projection: {
        createdAt: 1,
        restaurant: 1
      },
      limit: 10000000
    }).toPromise();

    console.log(invoices);
    const invoicePatches = invoices.map(invoice => ({
      old: {
        _id: invoice._id,
        restaurant: {}
      },
      new: {
        _id: invoice._id,
        restaurant: {
          id: newId
        }
      }
    }));

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=invoice', invoicePatches).toPromise();


  }

  async purge(dbName) {
    if (['job', 'event'].indexOf(dbName) < 0) {
      alert('Not supported');
    }

    const cutoffTime = new Date().valueOf() - 30 * 24 * 3600000;
    const queryBatchSize = 24000;
    const deleteBatchSize = 300;
    while (true) {
      const items = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: dbName,
        query: {
          createdAt: { $lt: cutoffTime },
        },
        projection: {
          createdAt: 1
        },
        limit: queryBatchSize
      }).toPromise();

      if (items.length === 0) {
        break;
      }
      console.log(`deleting ${items.length} ${new Date(items[0].createdAt)}`);
      let batched = Array(Math.ceil(items.length / deleteBatchSize)).fill(0).map((i, index) => items.slice(index * deleteBatchSize, (index + 1) * deleteBatchSize));
      // console.log(batched)

      await Promise.all(batched.map(batch => this._api.delete(environment.qmenuApiUrl + 'generic', {
        resource: dbName,
        ids: batch.map(i => i._id)
      }).toPromise()));

    }
  }

  async fixLonghornPhoenix() {
    const printClients = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'print-client',
      query: {
      },
      limit: 8000
    }).toPromise();
    console.log(printClients);
    const rtPrintClients = {};
    printClients.map(pc => {
      if (pc.restaurant) {
        rtPrintClients[pc.restaurant._id] = rtPrintClients[pc.restaurant._id] || [];
        rtPrintClients[pc.restaurant._id].push(pc);
      }
    });

    for (let key of Object.keys(rtPrintClients)) {
      if (rtPrintClients[key].length > 1) {
        const clients = rtPrintClients[key].sort((c2, c1) => new Date(c1.createdAt).valueOf() - new Date(c2.createdAt).valueOf());
        if (clients[0].type === 'longhorn') {
          console.log(clients);
          await this._api.delete(environment.qmenuApiUrl + "generic", {
            resource: "print-client",
            ids: [clients[0]._id]
          });
        }
      }
    }
  }

  async computeDuplicates() {
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
      },
      projection: {
        name: 1,
        'googleAddress.place_id': 1,
        'googleAddress.formatted_address': 1,
        'rateSchedules.agent': 1,
        previousRestaurantId: 1,
        disabled: 1,
        channels: 1,
        createdAt: 1,
        "googleListing.place_id": 1
      },
      limit: 8000
    }).toPromise();
    const placeIdMap = {};
    restaurants.map(rt => {
      // if (rt.googleAddress) {
      //   placeIdMap[rt.googleAddress.place_id] = placeIdMap[rt.googleAddress.place_id] || [];
      //   placeIdMap[rt.googleAddress.place_id].push(rt);
      // }
      if (rt.googleListing) {
        placeIdMap[rt.googleListing.place_id] = placeIdMap[rt.googleListing.place_id] || [];
        placeIdMap[rt.googleListing.place_id].push(rt);
      }
    });
    const grouped = Object.keys(placeIdMap).map(place_id => ({ place_id: place_id, list: placeIdMap[place_id] }));
    grouped.sort((b, a) => a.list.length - b.list.length);
    const duplicatedGroups = grouped.filter(g => g.list.length > 1);

    console.log(duplicatedGroups)
  }

  async injectPopularItems() {
    // 1. get 1000 orders of each restaurant
    // 2. get miInstance.id of each menu
    // 3. get top 20 and inject back to restaurant
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
      },
      projection: {
        'name': 1,
        'menus.name': 1,
        'menus.popularMiIds': 1
      },
      limit: 8000
    }).toPromise();
    const restaurantsWithoutPopularItems = restaurants.filter(rt => rt.menus && rt.menus.length > 0 && !rt.menus.some(menu => menu.popularMiIds));

    // console.log('need injection: ', restaurantsWithoutPopularItems);
    for (let rt of restaurantsWithoutPopularItems) {

      // if (rt._id !== '57e9574c1d1ef2110045e665') {
      //   continue;
      // }
      console.log(rt.name, rt._id);
      const rtId = rt._id;
      const orders = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'order',
        query: {
          restaurant: { $oid: rtId }
        },
        projection: {
          'orderItems.miInstance.id': 1,
          'orderItems.miInstance.name': 1,
          'orderItems.menuName': 1
        },
        limit: 1000
      }).toPromise();
      // console.log(orders);
      const menuIdCounter = {};

      const idNameMap = {};


      orders.map(order => order.orderItems.filter(oi => oi.miInstance && oi.miInstance.id && oi.menuName).map(oi => {
        idNameMap[oi.miInstance.id] = oi.miInstance.name;
        menuIdCounter[oi.menuName] = menuIdCounter[oi.menuName] || {};
        menuIdCounter[oi.menuName][oi.miInstance.id] = (menuIdCounter[oi.menuName][oi.miInstance.id] || 0) + 1;
      }));

      const newRt = JSON.parse(JSON.stringify(rt));
      const menuPopularIds = Object.keys(menuIdCounter).map(menuName => {
        const idCoutDict = menuIdCounter[menuName];
        const sortedItems = Object.keys(idCoutDict).map(id => ({ id: id, name: idNameMap[id], count: idCoutDict[id] })).sort((i1, i2) => i2.count - i1.count);
        // popular: first item's 1/5
        const cutOff = sortedItems[0].count / 4 + 10;
        const popularItems = sortedItems.filter(s => s.count >= cutOff);
        newRt.menus.map(menu => {
          if (menu.name === menuName) {
            menu.popularMiIds = popularItems.map(item => item.id);
          }
        });
        // console.log(menuName, popularItems);
      });
      if (JSON.stringify(newRt) !== JSON.stringify(rt)) {
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [{
          old: rt,
          new: newRt
        }]).toPromise();
      }

    }

  }

  async migrateTme() {
    const tmeCourier = (await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'courier',
      query: {
        name: 'Ten Mile Express'
      },
      projection: {
        name: 1
      },
      limit: 1
    }).toPromise())[0];
    if (!tmeCourier) {
      return alert('TME No found');
    }
    const tmeRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        deliveryByTme: true
      },
      projection: {
        name: 1,
        "googleAddress.formatted_address": 1,
        "googleListing.phone": 1,
        "googleAddress.lat": 1,
        "googleAddress.lng": 1,
        "googleAddress.place_id": 1,
        "googleAddress.timezone": 1
      },
      limit: 100
    }).toPromise();

    console.log(tmeRestaurants);
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=courier', [{
      old: { _id: tmeCourier._id },
      new: {
        _id: tmeCourier._id, restaurants: tmeRestaurants.map(r => ({
          _id: r._id,
          name: r.name,
          formatted_address: (r.googleAddress || {}).formatted_address,
          phone: (r.googleListing || {}).phone,
          lat: (r.googleAddress || {}).lat,
          lng: (r.googleAddress || {}).lng,
          place_id: (r.googleAddress || {}).place_id,
          timezone: (r.googleAddress || {}).timezone,
        }))
      },
    }]).toPromise();
    alert('Done!');
  }

  async removeRedundantOptions() {
    // orders.map(order => {
    //   order.orderItems.map(oi => {
    //     oi.miInstance.sizeOptions = [...oi.miInstance.sizeOptions.slice(0, 2), ...oi.miInstance.sizeOptions.slice(2).filter(so => so.selected)];
    //     (oi.mcSelectedMenuOptions || []).map(options => {
    //       options.items = [...options.items.slice(0, 2), ...options.items.slice(2).filter(item => item.selected)];
    //     });
    //     (oi.miSelectedMenuOptions || []).map(options => {
    //       options.items = [...options.items.slice(0, 2), ...options.items.slice(2).filter(item => item.selected)];
    //     });
    //   });
    //   console.log(order._id, JSON.stringify(order).length);
    // });
  }

  async injectTimezone() {
    const missingTimezoneRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "googleAddress.timezone": null,
        "googleAddress.place_id": { $exists: true }
      },
      projection: {
        name: 1,
        "googleAddress.place_id": 1,
        "googleAddress.formatted_address": 1,
        "googleListing.place_id": 1,
        disabled: 1
      },
      limit: 60000
    }).toPromise();

    console.log(missingTimezoneRestaurants);
    for (let r of missingTimezoneRestaurants) {
      try {

        const addressDetails = await this._api.get(environment.qmenuApiUrl + "utils/google-address", {
          formatted_address: r.googleAddress.formatted_address
        }).toPromise();
        await this._api.patch(environment.qmenuApiUrl + "generic?resource=restaurant", [
          {
            old: { _id: r._id, googleAddress: {} },
            new: { _id: r._id, googleAddress: { timezone: addressDetails.timezone } }
          }
        ]).toPromise();
        console.log(r.name);
      } catch (error) {
        console.log(r.name, r.disabled, '-------------------');
        console.log(error);
      }
    }
  }

  // async migrateOrderStatuses() {
  //   // some completed or canceld that's not reflected into to orders :(
  //   const dateThreshold = new Date();
  //   dateThreshold.setDate(dateThreshold.getDate() - 2);
  //   const doneOrderStatuses = await this._api.get(environment.qmenuApiUrl + 'generic', {
  //     resource: 'orderstatus',
  //     query: {
  //       createdAt: { $gt: dateThreshold },
  //       $or: [{
  //         status: 'COMPLETED'
  //       }, {
  //         status: 'CANCELED'
  //       }]
  //     },
  //     projection: {},
  //     limit: 1
  //   }).toPromise();
  //   console.log(doneOrderStatuses);
  // }

  async migrateOrderStatuses() {
    for (let i = 0; i < 10000; i++) {
      try {
        const batch = 160;
        const notMigratedOrders = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'order',
          query: { "statuses": null },
          projection: {
            name: 1
          },
          limit: batch
        }).toPromise();
        console.log(notMigratedOrders);
        if (notMigratedOrders.length === 0) {
          console.log('ALL DONE!');
          break;
        }
        const orderIds = [...new Set(notMigratedOrders.map(o => o._id))].filter(id => id);
        const statuses = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'orderstatus',
          query: {
            order: { $in: orderIds.map(id => ({ $oid: id })) }
          },
          limit: batch * 10
        }).toPromise();
        console.log(statuses);
        statuses.map(status => {
          delete status._id;
          delete status.updatedAt;
        });
        // whatever reason we didn't have status, let's put a fake one submitted

        const patchPairs = [];
        notMigratedOrders.map(order => {
          const myStatuses = statuses.filter(status => status.order === order._id);
          myStatuses.sort((s1, s2) => new Date(s1.createdAt).valueOf() - new Date(s2.createdAt).valueOf());
          if (myStatuses.length === 0) {
            console.log(order)
            myStatuses.push({
              "status": "SUBMITTED",
              "updatedBy": "BY_CUSTOMER",
              "order": order._id,
              "createdAt": new Date(parseInt(order._id.substring(0, 8), 16) * 1000).toISOString()
            });
            patchPairs.push(
              {
                old: { _id: order._id },
                new: { _id: order._id, statuses: myStatuses }
              }
            );
          } else {
            patchPairs.push(
              {
                old: { _id: order._id },
                new: { _id: order._id, statuses: myStatuses }
              }
            );
          }

        });
        console.log(patchPairs);

        const patched = await this._api.patch(environment.qmenuApiUrl + 'generic?resource=order', patchPairs).toPromise();
        console.log(patched);

      } catch (error) {
        console.log(error);
      }

    }
  }

  async migrateOrderAddress() {
    for (let i = 0; i < 1000; i++) {
      const batch = 160;
      const deliveryOrders = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'order',
        query: {
          type: "DELIVERY",
          "address.place_id": null
        },
        projection: {
          deliveryAddress: 1
        },
        limit: batch
      }).toPromise();
      console.log(deliveryOrders);
      if (deliveryOrders.length === 0) {
        console.log('ALL DONE!');
        break;
      }
      const addressIds = [...new Set(deliveryOrders.map(o => o.deliveryAddress))].filter(id => id);
      const addresses = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'googleaddress',
        query: {
          _id: { $in: addressIds.map(id => ({ $oid: id })) }
        },
        limit: batch
      }).toPromise();
      console.log(addresses);
      const addressIdDict = addresses.reduce((map, address) => (map[address._id] = address, map), {});
      // patch back to orders!
      const patchPairs = deliveryOrders.map(o => ({
        old: { _id: o._id },
        new: { _id: o._id, address: addressIdDict[o.deliveryAddress] || { place_id: 'unknown' } }
      }));
      console.log(patchPairs);

      const patched = await this._api.patch(environment.qmenuApiUrl + 'generic?resource=order', patchPairs).toPromise();
      console.log(patched);
    }
  }

  async migrateOrderPaymentCustomerRestaurant() {
    for (let i = 0; i < 1000; i++) {
      const batch = 160;
      const orders = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'order',
        query: {
          "customerObj._id": null
        },
        projection: {
          payment: 1,
          customer: 1,
          restaurant: 1
        },
        limit: batch
      }).toPromise();
      console.log(orders);
      if (orders.length === 0) {
        console.log('ALL DONE!');
        break;
      }

      // populate restaurantObj and customerObj
      const customerIds = [...new Set(orders.map(o => o.customer))].filter(id => id && id.toString().length > 8);
      console.log(customerIds);

      const customers = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'customer',
        query: {
          _id: { $in: customerIds.map(id => ({ $oid: id })) }
        },
        projection: {
          email: 1,
          banCounter: 1,
          bannedReasons: 1,
          firstName: 1,
          lastName: 1,
          phone: 1,
          socialProfilePhoto: 1,
          socialProvider: 1,
        },
        limit: batch
      }).toPromise();

      console.log(customers);
      const customerIdDict = customers.reduce((map, item) => (map[item._id] = item, map), {});

      const restaurantIds = [...new Set(orders.map(o => o.restaurant))].filter(id => id && id.toString().length > 8);
      console.log(restaurantIds);
      const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: {
          _id: { $in: restaurantIds.map(id => ({ $oid: id })) }
        },
        projection: {
          alias: 1,
          logo: 1,
          name: 1
        },
        limit: batch
      }).toPromise();

      console.log(restaurants);
      const restaurantIdDict = restaurants.reduce((map, item) => (map[item._id] = item, map), {});


      const paymentIds = [...new Set(orders.map(o => o.payment))].filter(id => id);
      const payments = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'payment',
        query: {
          _id: { $in: paymentIds.map(id => ({ $oid: id })) }
        },
        projection: {
          createdAt: 0,
          updatedAt: 0
        },
        limit: batch
      }).toPromise();

      console.log(payments);
      const paymentIdDict = payments.reduce((map, item) => (map[item._id] = item, map), {});

      const ccIds = [...new Set(payments.map(p => p.creditCard))].filter(id => id);
      const ccs = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'creditcard',
        query: {
          _id: { $in: ccIds.map(id => ({ $oid: id })) }
        },
        projection: {
          createdAt: 0,
          updatedAt: 0
        },
        limit: batch
      }).toPromise();

      console.log(ccs);
      const ccIdDict = ccs.reduce((map, item) => (map[item._id] = item, map), {});

      payments.map(p => {
        if (p.creditCard) {
          p.card = ccIdDict[p.creditCard] || {};
        }
      });

      // patch back to orders!
      const patchPairs = orders.map(o => ({
        old: { _id: o._id },
        new: { _id: o._id, paymentObj: paymentIdDict[o.payment] || {}, customerObj: customerIdDict[o.customer] || { _id: o.customer }, restaurantObj: restaurantIdDict[o.restaurant] || { _id: o.restaurant } }
      }));
      console.log(patchPairs);

      const patched = await this._api.patch(environment.qmenuApiUrl + 'generic?resource=order', patchPairs).toPromise();
      console.log(patched);
    }
  }


  migrateAddress() {
    // let's batch 20 every time
    const batchSize = 200;
    let myRestaurants;
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        address: { $exists: true },
        googleAddress: { $exists: false },
      },
      projection: {
        address: 1,
        name: 1
      },
      limit: batchSize
    }).pipe(mergeMap(restaurants => {
      myRestaurants = restaurants;
      return this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "address",
          query: {
            _id: { $in: restaurants.filter(r => r.address).map(r => r.address._id || r.address) },
          },
          limit: batchSize
        });
    })).pipe(mergeMap(addresses => {
      if (addresses.length === 0) {
        throw 'No referenced address found for restaurants ' + myRestaurants.map(r => r.name).join(', ');
      }
      const myRestaurantsOriginal = JSON.parse(JSON.stringify(myRestaurants));
      const myRestaurantsChanged = JSON.parse(JSON.stringify(myRestaurants))
      const addressMap = {};
      addresses.map(a => addressMap[a._id] = a);
      myRestaurantsChanged.map(r => r.googleAddress = addressMap[r.address ? (r.address._id || r.address) : 'non-exist']);

      return this._api
        .patch(
          environment.qmenuApiUrl + "generic?resource=restaurant",
          myRestaurantsChanged.map(clone => ({
            old: myRestaurantsOriginal.filter(r => r._id === clone._id)[0],
            new: clone
          }))
        );
    })
    ).subscribe(
      patchResult => {
        this._global.publishAlert(
          AlertType.Success,
          "Migrated: " + myRestaurants.filter(r => patchResult.indexOf(r._id) >= 0).map(r => r.name).join(', ')
        );
        this._global.publishAlert(
          AlertType.Danger,
          "Non-Migrated: " + myRestaurants.filter(r => patchResult.indexOf(r._id) < 0).map(r => r.name).join(', ')
        );
      },
      error => {
        console.log(error);
        this._global.publishAlert(
          AlertType.Danger,
          "Error: " + JSON.stringify(error)
        );
      });

  }

  removeDuplicates() {
    // 1. query ALL with restaurantIds
    // 2. calculate duplicated
    // 3. remove duplicated

    this._api
      .get(environment.qmenuApiUrl + "generic", {
        resource: "lead",
        query: {
          restaurantId: { $exists: true }
        },
        projection: {
          restaurantId: 1
        },
        limit: 6000
      })
      .subscribe(
        result => {
          const duplicatedIds = [];
          const existingRestaurantIdSet = new Set();
          result.map(lead => {
            if (existingRestaurantIdSet.has(lead.restaurantId)) {
              duplicatedIds.push(lead._id);
            } else {
              existingRestaurantIdSet.add(lead.restaurantId);
            }
          });
          this.removeLeads(duplicatedIds);
        },
        error => {
          this._global.publishAlert(
            AlertType.Danger,
            "Error pulling gmb from API"
          );
        }
      );
  }

  removeLeads(leadIds) {
    leadIds.length = 200;
    this._api
      .delete(environment.qmenuApiUrl + "generic", {
        resource: "lead",
        ids: leadIds
      })
      .subscribe(
        result => {
          this._global.publishAlert(
            AlertType.Success,
            result.length + " was removed"
          );
        },
        error => {
          this._global.publishAlert(AlertType.Danger, "Error updating to DB");
        }
      );
  }

  removeOrphanPhones() {
    this.removingOrphanPhones = true;
    // load ALL phones and restaurants
    zip(
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "phone",
        projection: {
          restaurant: 1
        },
        limit: 60000
      }),
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        projection: {
          name: 1
        },
        limit: 10000
      })
    ).pipe(mergeMap(result => {
      const restaurantSet = new Set(result[1].map(r => r._id));
      const phones = result[0];
      const goodPhones = phones.filter(p => restaurantSet.has(p.restaurant));
      const badPhones = phones.filter(p => !restaurantSet.has(p.restaurant));
      // get phones with restaurant id missin in restaurants

      return this._api.delete(
        environment.qmenuApiUrl + "generic",
        {
          resource: 'phone',
          ids: badPhones.map(phone => phone._id)
        }
      );
    }))
      .subscribe(
        result => {

          this.removingOrphanPhones = false;

          // let's remove bad phones!
        },
        error => {
          this.removingOrphanPhones = false;
          this._global.publishAlert(
            AlertType.Danger,
            "Error pulling gmb from API"
          );
        }
      );
  }

  fixCallLogs() {
    this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'lead',
      query: {
        'callLogs.0': { $exists: true },
      },
      projection: {
        callLogs: 1
      },
      limit: 150000
    }).subscribe(
      leads => {
        let counter = 0;
        leads.map(lead => {
          if (!Array.isArray(lead.callLogs)) {
            counter++;
            const original = lead;
            const changed = JSON.parse(JSON.stringify(original));
            delete original.callLogs;
            changed.callLogs = [changed.callLogs['0']];
            this._api.patch(environment.qmenuApiUrl + "generic?resource=lead", [{ old: original, new: changed }]).subscribe(patched => console.log(patched));
          }
        })

        this._global.publishAlert(
          AlertType.Success,
          "Found/Fixed " + counter
        );
      },
      error => {
        this._global.publishAlert(
          AlertType.Danger,
          "Error pulling leads from API"
        );
      }
    )
  }

  fixAddress() {
    // let's batch 20 every time
    const batchSize = 20;
    let myRestaurants;
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        googleAddress: { $exists: true },
        "googleAddress.street_number": { $exists: false },
      },
      projection: {
        googleAddress: 1,
        name: 1
      },
      limit: batchSize
    }).subscribe(restaurants => {
      console.log(restaurants);
      myRestaurants = restaurants;
      // now let's request and update each

      restaurants.map(r => {
        this._api.get(environment.qmenuApiUrl + "utils/google-address", {
          place_id: r.googleAddress.place_id
        }).pipe(mergeMap(address => {
          const rOrignal = JSON.parse(JSON.stringify(r));
          const rClone = JSON.parse(JSON.stringify(r));
          Object.assign(rClone.googleAddress, address);
          return this._api
            .patch(
              environment.qmenuApiUrl + "generic?resource=restaurant", [{
                old: rOrignal,
                new: rClone
              }]
            );
        })).subscribe(
          patchResult => {
            this._global.publishAlert(
              AlertType.Success,
              "Migrated: " + r.name
            );
            console.log('patched:', r.name);
          },
          error => {
            console.log('Error finding place_id: ' + r.name);
            this._global.publishAlert(
              AlertType.Danger,
              "Error: " + JSON.stringify(error)
            );
          });

      });

    });
  }

  injectDeliveryBy() {
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        deliveryByTme: true
      },
      projection: {
        name: 1
      },
      limit: 10000
    }).pipe(mergeMap(restaurants => {
      console.log(restaurants);
      this._global.publishAlert(
        AlertType.Success,
        "Restaurants affected " + restaurants.map(r => r.name).join(", ")
      );
      return this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "order",
          query: {
            restaurant: { $in: restaurants.map(r => ({ $oid: r._id })) },
            type: "DELIVERY",
            deliveryBy: { $ne: 'TME' }
          },
          projection: {
            type: 1,
            restaurant: 1,
            createdAt: 1
          },
          limit: 500
        });
    })).pipe(mergeMap(orders => {
      console.log(orders);
      return this._api
        .patch(environment.qmenuApiUrl + "generic?resource=order", orders.map(o => {
          const oldO = JSON.parse(JSON.stringify(o));
          const newO = JSON.parse(JSON.stringify(o));
          newO.deliveryBy = 'TME';
          return {
            old: oldO,
            new: newO
          };
        }));
    })).subscribe(
      updatedOrders => {
        console.log(updatedOrders);
        this._global.publishAlert(
          AlertType.Success,
          "Updated " + updatedOrders.length
        );
      },
      error => {
        this._global.publishAlert(
          AlertType.Danger,
          "Error: " + JSON.stringify(error)
        );
      }
    );
  } // end injectDeliveryBy


  injectDeliveryByToInvoice() {

    let orderIdMap = {};
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "order",
      query: {
        deliveryBy: { $exists: true }
      },
      projection: {
        deliveryBy: 1
      },
      limit: 50
    }).pipe(mergeMap(orders => {
      console.log(orders);
      orders.map(o => orderIdMap[o._id] = o);
      this._global.publishAlert(
        AlertType.Success,
        "Total orders: " + orders.length
      );
      return this._api
        .get(environment.qmenuApiUrl + "generic", {
          resource: "invoice",
          query: {
            "orders.id": { $in: orders.map(r => r._id) }
          },
          projection: {
            "restaurant.name": 1,
            createdAt: 1,
            orders: 1
          },
          limit: 500
        });
    })).pipe(mergeMap(invoices => {
      console.log(invoices);
      const originInvoices = JSON.parse(JSON.stringify(invoices));
      const affectedInvoicies = new Set();
      invoices.map(invoice => {
        invoice.orders.map(o => {
          if (orderIdMap[o.id] && o.deliveryBy !== orderIdMap[o.id].deliveryBy) {
            o.deliveryBy = orderIdMap[o.id].deliveryBy;
            console.log(o);
            affectedInvoicies.add(invoice);
          }
        });
      });

      if (affectedInvoicies.size === 0) {
        throw 'No invoice affect!';
      }
      console.log(affectedInvoicies);

      return this._api
        .patch(environment.qmenuApiUrl + "generic?resource=invoice", Array.from(affectedInvoicies).map(invoice => {
          let index = invoices.indexOf(invoice);
          const oldInvoice = JSON.parse(JSON.stringify(originInvoices[index]));
          const newInvoice = JSON.parse(JSON.stringify(invoices[index]));
          console.log(oldInvoice);
          console.log(newInvoice);
          return {
            old: oldInvoice,
            new: newInvoice
          };
        }));


    })).subscribe(
      updatedOrders => {
        console.log(updatedOrders);
        this._global.publishAlert(
          AlertType.Success,
          "Updated " + updatedOrders.length
        );
      },
      error => {
        this._global.publishAlert(
          AlertType.Danger,
          "Error: " + JSON.stringify(error)
        );
      }
    );
  } // end injectDeliveryBy

  async injectTotalEtcToInvoice() {
    alert('only ones without transactionAdjustment')
    const invoices = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "invoice",
      query: {},
      projection: {
        "restaurant.name": 1,
        isCanceled: 1,
        adjustments: 1,
        transactionAdjustment: 1
      },
      limit: 50000000
    }).toPromise();

    const withAdjustments = invoices.filter(i => i.adjustments && i.adjustments.length > 0 && i.transactionAdjustment === undefined);
    console.log(withAdjustments.length)

    for (let i of withAdjustments) {
      await this._api.post(environment.appApiUrl + 'invoices/compute-derived-fields', { id: i._id }).toPromise();
    }

    console.log(invoices.length)
  } // injectTotalEtcToInvoice

  async migrateEmailAndPhones() {
    // faxable -> {Fax, Order}
    // callable -> {Phone, Order}
    // textable -> {SMS, Order}
    // (nothing) -> {Phone, Business}
    // email --> split(, or ;) --> {Email, Order}
    const restaurants = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        $or: [
          { email: { $exists: true } },
          { phones: { $exists: true } },
        ]
      },
      projection: {
        phones: 1,
        channels: 1,
        name: 1,
        email: 1
      },
      limit: 6000
    }).toPromise();

    // find those

    const pairs = [];

    restaurants.map(r => {
      console.log(r.name);
      const emails = (r.email || '').replace(/\s/g, '').split(',').join(';').split(';').filter(email => email);
      const phones = r.phones || [];
      const channels = r.channels || [];

      // test against email:
      const oldChannels = JSON.parse(JSON.stringify(channels));

      emails.map(email => {
        if (!channels.some(c => c.value.toLowerCase() === email.toLowerCase())) {
          channels.push({
            type: 'Email',
            notifications: ['Order', 'Invoice'],
            value: email.toLowerCase()
          });
        }
      });

      // test against phones!
      phones.map(phone => {
        if (phone.callable) {
          let phoneChannel = channels.filter(c => c.type === 'Phone' && c.value === phone.phoneNumber)[0];
          if (!phoneChannel) {
            phoneChannel = {
              type: 'Phone',
              notifications: [],
              value: phone.phoneNumber
            };
            channels.push(phoneChannel);
          }
          phoneChannel.notifications = phoneChannel.notifications || [];
          if (phoneChannel.notifications.indexOf('Order') < 0) {
            phoneChannel.notifications.push('Order');
          }
          if (phone.type === 'Business' && phoneChannel.notifications.indexOf('Business') < 0) {
            phoneChannel.notifications.push('Business');
          }
        }

        if (phone.faxable) {
          let faxChannel = channels.filter(c => c.type === 'Fax' && c.value === phone.phoneNumber)[0];
          if (!faxChannel) {
            faxChannel = {
              type: 'Fax',
              notifications: [],
              value: phone.phoneNumber
            };
            channels.push(faxChannel);
          }
          faxChannel.notifications = faxChannel.notifications || [];
          if (faxChannel.notifications.indexOf('Order') < 0) {
            faxChannel.notifications.push('Order');
          }
        }

        if (phone.textable) {
          let textChannel = channels.filter(c => c.type === 'SMS' && c.value === phone.phoneNumber)[0];
          if (!textChannel) {
            textChannel = {
              type: 'SMS',
              notifications: [],
              value: phone.phoneNumber
            };
            channels.push(textChannel);
          }
          textChannel.notifications = textChannel.notifications || [];
          if (textChannel.notifications.indexOf('Order') < 0) {
            textChannel.notifications.push('Order');
          }

          if (phone.type === 'Business' && textChannel.notifications.indexOf('Business') < 0) {
            textChannel.notifications.push('Business');
          }
        }

      }); // end each phone

      const stringAfter = JSON.stringify(channels);
      if (JSON.stringify(oldChannels) !== stringAfter) {
        pairs.push({
          old: { _id: r._id },
          new: { _id: r._id, channels: channels }
        });
      }

    }); // end each restaurant

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', pairs).toPromise();
    console.log(pairs.length);
    this._global.publishAlert(AlertType.Success, 'Patched ' + pairs.length);
  } // end of migrateEmailAndPhones

  convertGmb() {
    let myRestaurants;
    zip(
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "gmb",
        projection: {
          email: 1,
          password: 1
        },
        limit: 700000
      }),
      this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "gmbAccount",
        projection: {
          email: 1
        },
        limit: 700000
      })).pipe(mergeMap(gmbs => {
        const newGmbs = gmbs[0].filter(g0 => !gmbs[1].some(g1 => g1.email.toLowerCase() === g0.email.toLowerCase()));
        // remove id because newly inserted will have id
        newGmbs.map(g => delete g._id);
        // convert email to lowercase
        newGmbs.map(g => g.email = g.email.toLowerCase());

        return this._api.post(environment.qmenuApiUrl + 'generic?resource=gmbAccount', newGmbs);
      })).subscribe(
        gmbIds => {
          this._global.publishAlert(
            AlertType.Success,
            "Success! Total: " + gmbIds.length
          );
        },
        error => {
          this._global.publishAlert(
            AlertType.Danger,
            "Error: " + JSON.stringify(error)
          );
        });
  }

  getStripeErrors() {
    // get ALL payment, method === QMENU, without stripeObject.charges
    // has order with the id, order status is confirmed
    this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "payment",
      query: {
        "method": "QMENU",
        "stripeObject.charges": { "$exists": false }
      },
      projection: {
        createdAt: 1
      },
      sort: {
        createdAt: -1
      },
      limit: 100
    }).pipe(mergeMap(payments => {
      console.log(payments);
      return this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "order",
        query: {
          "payment": { $in: payments.map(r => ({ $oid: r._id })) }
        },
        projection: {
          restaurant: 1
        },
        limit: 500
      });
    }))


      .subscribe(payments => {
        console.log(payments)
      });
  }

  async genericTesting() {
    // get newest duplicate!

    const invoices = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'invoice',
      query: {
        balance: 0
      },
      projection: {
        balance: 1,
        isSent: 1,
        isCanceled: 1
      },
      limit: 16000
    }).toPromise();
    console.log(invoices);
    let nonsentnoncanceled = invoices.filter(invoice => !invoice.isSent && !invoice.isCanceled);
    console.log(nonsentnoncanceled);
    nonsentnoncanceled = nonsentnoncanceled.slice(0, 100);
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=invoice', nonsentnoncanceled.map(invoice => ({
      old: {
        _id: invoice._id
      },
      new: {
        _id: invoice._id,
        isSent: true,
        isPaymentSent: true,
        isPaymentCompleted: true
      },
    }))).toPromise();

  }

  async fixMissingBusinessPhones() {
    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        channels: 1,
        "googleAddress.formatted_address": 1
      },
      limit: 10000
    }).toPromise();

    console.log(restaurants);
    const restaurantsMissingBizPhones = restaurants.filter(r => r.channels && !r.channels.some(c => c.type === 'Phone' && (c.notifications || []).some(n => n === 'Business')));

    console.log(restaurantsMissingBizPhones);

    for (let r of restaurantsMissingBizPhones) {
      try {
        const crawledResult = await this._api.get(environment.qmenuApiUrl + "utils/scan-gmb", { q: `${r.name} ${r.googleAddress.formatted_address}` }).toPromise();
        console.log(crawledResult);
        if (crawledResult.phone) {
          // inject phone!
          // update qmenuId!
          const existingChannels = r.channels || [];
          const clonedChannels = existingChannels.slice(0);
          clonedChannels.push({
            value: crawledResult.phone,
            notifications: ['Business', 'Order'],
            type: 'Phone'
          });

          await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
            {
              old: { _id: r._id },
              new: { _id: r._id, channels: clonedChannels }
            }]).toPromise();
        }
      } catch (error) {

      }
    }
  }

  async createApplyGmbTask() {
    let restaurantList = [];

    restaurantList = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      projection: {
        name: 1,
        id: 1,
        "googleAddress.formatted_address": 1
      },
      limit: 6000
    }).toPromise();


    const gmbBizBatchSize = 3000;
    const bizList = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbBiz',
        projection: {
          qmenuId: 1
        },
        skip: bizList.length,
        limit: gmbBizBatchSize
      }).toPromise();
      bizList.push(...batch);
      if (batch.length === 0 || batch.length < gmbBizBatchSize) {
        break;
      }
    }


    let missingRt = restaurantList.filter(each => !bizList.some(biz => biz.qmenuId == each._id));
    //missingRt.length = 2;
    //console.log('missingRt', missingRt);
    //console.log("no googleAddress", missingRt.filter(each=> !each.googleAddress));

    const gmbBizList = missingRt.map(each => ({
      name: each.name,
      qmenuId: each._id,
      address: each.googleAddress ? each.googleAddress.formatted_address : ''
    }));

    const bizs = await this._api.post(environment.qmenuApiUrl + 'generic?resource=gmbBiz', gmbBizList).toPromise();
    this._global.publishAlert(AlertType.Success, 'Created new GMB');

  }

  async crawlRestaurants() {
    let zipCodeList = [];
    zipCodeList = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        "googleAddress.zipCode": {
          "$exists": true
        }
      },
      projection: {
        name: 1,
        id: 1,
        "googleAddress.zipCode": 1
      },
      limit: 6000
    }).toPromise();

    zipCodeList = zipCodeList.map(each => each.googleAddress.zipCode);
    const uniqueValues = [...new Set(zipCodeList)];
    console.log(uniqueValues);

    this._global.publishAlert(AlertType.Success, 'Created new GMB');


  }

  async fixMenu() {
    const havingNullRestaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        "menus.mcs.mis": null,
        "menus": { $exists: 1 }
      },
      projection: {
        name: 1,
        "menus": 1
      },
    }, 6000);
    console.log(havingNullRestaurants);
    // remove mi, empty mc, and empty menu!

    // havingNullRestaurants.length = 1;
    // big patch
    const patchList = havingNullRestaurants.map(r => {
      const oldR = r;
      const newR = JSON.parse(JSON.stringify(r));
      console.log(newR.name)

      // remove ALL empty or null mis
      newR.menus.map(menu => (menu.mcs || []).map(mc => {
        const beforeCount = (mc.mis || []).length;
        mc.mis = (mc.mis || []).filter(mi => mi);
        const afterCount = (mc.mis || []).length;
        if (beforeCount !== afterCount) {
          console.log('category with empty mi: ', mc.name);
        }
      }));
      // remove ALL empty mcs
      newR.menus.map(menu => {
        const beforeCount = (menu.mcs || []).length;
        menu.mcs = (menu.mcs || []).filter(mc => mc.mis.length > 0);
        const afterCount = (menu.mcs || []).length;
        if (beforeCount !== afterCount) {
          console.log('menu with empty category: ', menu.name);
        }

      });
      // remove ALL empty menus
      if (newR.menus.some(menu => menu.mcs.length === 0)) {
        console.log(newR.name, ' has empty menu');
      }
      newR.menus = (newR.menus || []).filter(menu => menu.mcs && menu.mcs.length > 0);

      return ({
        old: { _id: oldR._id },
        new: { _id: newR._id, menus: newR.menus }
      });
    });
    console.log(patchList);

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', patchList).toPromise();

    // find restaurants with duplicated menuIds
    const allIdNames = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1
      },
      limit: 8000
    }).toPromise();

    const batchSize = 100;

    const batchedIdNames = Array(Math.ceil(allIdNames.length / batchSize)).fill(0).map((i, index) => allIdNames.slice(index * batchSize, (index + 1) * batchSize));

    const affectedRestaurants = [];

    for (let idNames of batchedIdNames) {
      const batchedRestaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: {
          _id: {
            $in: idNames.map(idName => ({ $oid: idName._id }))
          }
        },
        projection: {
          name: 1,
          "menus.mcs.mis.id": 1,
          "menus.mcs.mis.category": 1
        },
        limit: 6000
      }).toPromise();

      const restaurantWithDuplicatedMenuIds = batchedRestaurants.filter(r => {
        const idSet = new Set();
        let hasDuplicatedId = false;
        (r.menus || []).map(menu => (menu.mcs || []).map(mc => (mc.mis || []).map(mi => {
          if (mi.id) {
            if (idSet.has(mi.id)) {
              hasDuplicatedId = true;
              console.log(mi);
              console.log(r.name, menu, mc);
            }
            idSet.add(mi.id);
          }
        })));

        return hasDuplicatedId;
      });
      console.log(restaurantWithDuplicatedMenuIds);
      affectedRestaurants.push(...restaurantWithDuplicatedMenuIds);
    }
    console.log('final: ', affectedRestaurants);

    const affectedRestaurantsFull = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        _id: {
          $in: affectedRestaurants.map(idName => ({ $oid: idName._id }))
        }
      },
      projection: {
        name: 1,
        "menus": 1
      },
      limit: 6000
    }).toPromise();

    // remove duplicated ids
    // affectedRestaurantsFull.length = 1;

    console.log(affectedRestaurantsFull);
    affectedRestaurantsFull.map(r => {
      const idSet = new Set();
      r.menus.map(menu => menu.mcs.map(mc => {
        for (let i = (mc.mis || []).length - 1; i >= 0; i--) {
          if (idSet.has(mc.mis[i].id)) {
            //splice
            console.log('found one!', mc.mis[i]);
            mc.mis.splice(i, 1);
          } else {
            idSet.add(mc.mis[i].id)
          }
        }
      }));

      console.log(idSet);
    });

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', affectedRestaurantsFull.map(r => ({
      old: { _id: r._id },
      new: { _id: r._id, menus: r.menus }
    }))).toPromise();
  }


  async handleHolidy() {



    // 1. query restaurant with textable phones
    // 2. test if thanksgiving is already closed. if no:
    // 3. schedule a text (every 2 seconds apart??)
    // 4. make a table to capture result?
    //

    alert('DO NOT USE')
    // const restaurants: Restaurant[] = (await this._api.get(environment.qmenuApiUrl + "generic", {
    //   resource: "restaurant",
    //   projection: {
    //     name: 1,
    //     "phones.textable": 1,
    //     disabled: 1,
    //     channels: 1,
    //     closedHours: 1
    //   },
    //   limit: 6000
    // }).toPromise()).map(r => new Restaurant(r));

    // console.log('total: ', restaurants.length);

    // const reachableRestaurants: any = restaurants.filter(r => (r.phones || []).some(p => p.textable) || (r.channels || []).some(c => c.type === 'SMS' || c.type === 'Email'));

    // console.log('text or email reachable: ', reachableRestaurants.length);

    // const checkPoint = new Date('Nov 22 2018 17:00:00 GMT-0500'); // 5PM
    // const notAlreadyClosed: any = reachableRestaurants.filter(r => !r.closedHours || !r.closedHours.some(hr => hr.isOpenAtTime(checkPoint)));

    // console.log('not already closed: ', notAlreadyClosed.length);

    // // inject an closedHour:
    // const closedHour = new Hour({
    //   occurence: 'ONE-TIME',
    //   fromTime: new Date('Nov 22 2018 5:00:00 GMT-0500'),
    //   toTime: new Date('Nov 23 2018 5:00:00 GMT-0500'),
    //   comments: 'Happy Thanksgiving'
    // });

    // // reverse to remove preset closed hours
    // // notAlreadyClosed.map(r => {
    // //   r.closedHours = r.closedHours || [];
    // //   // lets remove expired hours on our way
    // //   const before = r.closedHours.length;
    // //   // keep old hours
    // //   r.closedHours = r.closedHours.filter(h => !(h.occurence === 'ONE-TIME' && h.fromTime.valueOf() === closedHour.valueOf()));

    // // });

    // notAlreadyClosed.map(r => {
    //   r.closedHours = r.closedHours || [];
    //   // lets remove expired hours on our way
    //   const before = r.closedHours.length;
    //   r.closedHours = r.closedHours.filter(h => h.occurence !== 'ONE-TIME' || h.toTime.valueOf() > new Date().valueOf());

    //   const after = r.closedHours.length;
    //   if (before > after) {
    //     console.log(r.name, r.closedHours);
    //   }
    //   r.closedHours.push(closedHour);

    // });


    // // await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', notAlreadyClosed.map(r => ({
    // //   old: { _id: r._id },
    // //   new: { _id: r._id, closedHours: r.closedHours }
    // // }))).toPromise();

    // // schedule text, or email events!
    // const jobs = [];
    // let scheduledAt = new Date().valueOf();
    // reachableRestaurants.map(restaurant => {
    //   // blast only unique phone numbers or emails
    //   // emails!
    //   const emailsInRestaurant = (restaurant.email || '').replace(/;/g, ',').split(',').filter(e => e).map(e => e.trim()).filter(e => e);
    //   const emailsInChannels = (restaurant.channels || []).filter(c => c.type === 'Email' && c.notifications && Array.isArray(c.notifications) && c.notifications.indexOf('Order') >= 0).map(c => c.value);
    //   const finalEmails = [...new Set([...emailsInChannels, ...emailsInRestaurant])];
    //   // console.log('emails to send:', finalEmails);

    //   // sms!
    //   const smsNumbersInPhones = (restaurant.phones || []).filter(p => p.textable && p.phoneNumber).map(p => p.phoneNumber);
    //   const smsNumbersInChannels = (restaurant.channels || []).filter(c => c.type === 'SMS' && c.notifications && Array.isArray(c.notifications) && c.notifications.indexOf('Order') >= 0).map(c => c.value);
    //   let finalSmsNumbers = [...new Set([...smsNumbersInPhones, ...smsNumbersInChannels])];

    //   // remove - of numbers

    //   finalSmsNumbers = finalSmsNumbers.map(number => number.replace(/\D/g, '')).filter(number => number.length === 10);

    //   const badFinalSmsNumbers = finalSmsNumbers.filter(number => !number || number.length !== 10);
    //   // console.log('sms to send:', finalSmsNumbers);
    //   if (badFinalSmsNumbers.length > 0) {
    //     console.log(restaurant.name, badFinalSmsNumbers);
    //   }

    //   const businessPhoneNumber = ((restaurant.phones || [])[0] || {}).phoneNumber;

    //   const smsMessage = 'From qMenu: If you will be OPEN on Thanksgiving day, please reply "OPEN" (without quotes) to this message by 10 PM Eastern time. If closed, you are all set and do NOT reply. Thank you.';

    //   const emailSubject = `Thanksgiving hours (${businessPhoneNumber})`;
    //   const emailContent = `
    //   <html><body>
    //   Dear restaurant owner,
    //   <br>
    //   <br>
    //   If you will be OPEN on Thanksgiving day, please reply "OPEN" (without quotes) to this email by 6 PM Eastern time. Otherwise, do NOT reply to the email and we will mark your restaurant as closed for the day so no orders can be placed. This message sent by qMenu.
    //   <br>
    //   <br>
    //   (For qMenu internal use only) Restaurant ID: [${restaurant._id}]
    //   <br>
    //   <br>
    //   Thanks,
    //   <br>
    //   <br>
    //   The qMenu Team`;

    //   finalEmails.map(email => {
    //     scheduledAt += 2000;
    //     jobs.push({
    //       name: "send-email",
    //       scheduledAt: scheduledAt,
    //       params: {
    //         to: email,
    //         subject: emailSubject,
    //         html: emailContent
    //       }
    //     });
    //   });

    //   finalSmsNumbers.map(phone => {
    //     scheduledAt += 2000;
    //     jobs.push({
    //       name: "send-sms",
    //       scheduledAt: scheduledAt,
    //       params: {
    //         to: phone,
    //         from: "8447935942",
    //         providerName: "plivo",
    //         message: smsMessage
    //       }
    //     });
    //   });
    // });

    // console.log(jobs);

    // const batchSize = 200;
    // const sleep = (milliseconds) => {
    //   return new Promise(resolve => setTimeout(resolve, milliseconds))
    // }

    // const batchedJobs = Array(Math.ceil(jobs.length / batchSize)).fill(0).map((i, index) => jobs.slice(index * batchSize, (index + 1) * batchSize));

    // for (let bjobs of batchedJobs) {
    //   try {
    //     console.log('processing ', bjobs.length);
    //     const addedJobs = await this._api.post(environment.qmenuApiUrl + 'events/add-jobs', bjobs).toPromise();
    //     await sleep(2000);
    //   } catch (error) {
    //     console.log("error: ", bjobs)
    //   }
    // }
    // this._global.publishAlert(AlertType.Success, 'Total notified: ', + notAlreadyClosed.length);

  }

  async fixPriceDataType() {
    const restaurantIds = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      // query: {
      //   "menus.mcs.mis.sizeOptions.price": { $type: "string" }
      // },
      projection: {
        name: 1
      },
      limit: 6000
    }).toPromise();

    const batchSize = 100;

    const batchedIds = Array(Math.ceil(restaurantIds.length / batchSize)).fill(0).map((i, index) => restaurantIds.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batchedIds) {
      const restaurants = (await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: {
          _id: {
            $in: batch.map(rid => ({ $oid: rid._id }))
          }
        },
        projection: {
          name: 1,
          "menus.mcs.mis.sizeOptions.price": 1,
          "menuOptions.items.price": 1
        },
        limit: batchSize
      }).toPromise()).map(r => new Restaurant(r));

      const badRestaurants = restaurants.filter(r => r.menus.some(menu => menu.mcs.some(mc => mc.mis.some(mi => mi.sizeOptions.some(so => typeof so.price === 'string')))));
      console.log(badRestaurants);
      // break;
      if (badRestaurants.length > 0) {
        // patch!
        const fixedRestaurant = function (restaurant) {
          const clone = JSON.parse(JSON.stringify(restaurant));
          clone.menus.map(menu => menu.mcs.map(mc => mc.mis.map(mi => mi.sizeOptions.map(so => so.price = +so.price))));
          return clone;
        }
        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', badRestaurants.map(r => ({
          old: r,
          new: fixedRestaurant(r)
        }))).toPromise();
      }

    }


  }

  async removeEmptySizeOption() {
    const restaurantIds = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      projection: {
        name: 1,
      },
    }, 6000)

    const batchSize = 50;
    const batchedIds = Array(Math.ceil(restaurantIds.length / batchSize)).fill(0).map((i, index) => restaurantIds.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batchedIds) {
      const restaurants = (await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: {
          _id: {
            $in: batch.map(rid => ({ $oid: rid._id }))
          }
        },
        projection: {
          name: 1,
          "menus": 1
        },
        limit: batchSize
      }).toPromise());

      restaurants.map(r => {
        if (r.menus && !Array.isArray(r.menus)) {
          throw "menus not array"
        }
        (r.menus || []).map(m => {
          if (m && m.mcs && !Array.isArray(m.mcs)) {
            //console.log(r._id);
            console.log(m)
            throw "mcs not array"
          }
          (m.mcs || []).map(mc => {
            if (mc && mc.mis && !Array.isArray(mc.mis)) {
              console.log(mc)
              throw "mis not array"
            }
            (mc.mis || []).map(mi => {
              if (mi && mi.sizeOptions && !Array.isArray(mi.sizeOptions)) {
                console.log(r._id, mi, mc)
                //throw "sizeOptions not array"
              }
            })
          })
        })
      })


      const badRestaurants = restaurants.filter(r => {
        return (r.menus || []).some(menu => (menu.mcs || []).some(mc => (mc.mis || []).some(mi => !mi || !mi.sizeOptions || !Array.isArray(mi.sizeOptions) || mi.sizeOptions.length === 0 || mi.sizeOptions.some(so => !so || !so.name))))
      });
      if (badRestaurants.length > 0) {
        // patch!
        const fixedMenu = function (restaurant) {
          console.log(restaurant._id);
          const clone = JSON.parse(JSON.stringify(restaurant));
          // remove null menu item
          clone.menus.map(menu => menu.mcs.map(mc => mc.mis = mc.mis.filter(mi => mi && mi.sizeOptions && Array.isArray(mi.sizeOptions))));
          // fix size options
          clone.menus.map(menu => menu.mcs.map(mc => mc.mis.map(mi => mi.sizeOptions = mi.sizeOptions.filter(so => so && so.name))));
          // fix menu
          clone.menus.map(menu => menu.mcs.map(mc => mc.mis = mc.mis.filter(mi => mi && mi.sizeOptions.length > 0)));
          return clone.menus;
        }

        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', badRestaurants.map(r => ({
          old: { _id: r._id },
          new: {
            _id: r._id, menus: fixedMenu(r)
          }
        }))).toPromise();
      }

    }


  }

  async removeInvoiceFromRestaurant() {
    const limit = 100;
    const restaurantsWithInvoicesAttribute = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: {
        'invoices.0': { $exists: true }
      },
      projection: {
        name: 1,
        invoices: 1
      },
      limit: limit
    }).toPromise();

    console.log(restaurantsWithInvoicesAttribute);

    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', restaurantsWithInvoicesAttribute.map(r => ({
      old: { _id: r._id, invoices: [] },
      new: { _id: r._id }
    }))).toPromise();

  }

  async fixRateSchedules() {
    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        rateSchedules: 1,
        name: 1
      }
    }, 5000);
    const updatedOldNewPairs = [];
    const updates = restaurants.map(r => {
      let updated = false;
      r.rateSchedules = r.rateSchedules || [];
      r.rateSchedules.map(rs => {
        let agent = (rs.agent || '').trim().toLowerCase();
        if (agent === 'hannah') {
          agent = 'charity';
        };
        if (agent === '') {
          agent = 'none';
        }
        if (agent !== rs.agent) {
          updated = true;
          rs.agent = agent;
        }
      });

      if (updated) {
        updatedOldNewPairs.push({
          old: { _id: r._id, name: r.name },
          new: { _id: r._id, name: r.name, rateSchedules: r.rateSchedules }
        });
      }
    });
    console.log(updatedOldNewPairs);
    if (updatedOldNewPairs.length > 0) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', updatedOldNewPairs).toPromise();
    }
  }

  async injectRestaurantScores() {

    const restaurants = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: 'restaurant',
      projection: {
        name: 1,
        updatedAt: 1
      },
      sort: {
        updatedAt: 1
      }
    }, 2000);

    // restaurants.length = 10;
    console.log(restaurants)
    for (let r of restaurants) {
      const score = await this._gmb3.injectRestaurantScore(r);
      console.log(score, r.name);
    }

  }

  async migrateGmbBizToRestaurants() {
    // match using gmbBiz -> restaurant
    //  - cid (restaurant.googleListing.cid <-> gmbBiz.cid)
    //  - using qemenuId
    // what about non-matched??? just leave it???

    const gmbBizBatchSize = 3000;
    const gmbBizList = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbBiz',
        projection: {
          gmbOwnerships: 0,
          accounts: 0
        },
        skip: gmbBizList.length,
        limit: gmbBizBatchSize
      }).toPromise();
      gmbBizList.push(...batch);
      if (batch.length === 0 || batch.length < gmbBizBatchSize) {
        break;
      }
    }

    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        disabled: 1,
        name: 1,
        "googleListing.cid": 1,
        "googleListing.gmbOwner": 1,
        "googleListing.gmbWebsite": 1,
        domain: 1,
        websiteTemplateName: 1,
        web: 1
      },
      limit: 6000
    }).toPromise();

    const cidMap = {};
    gmbBizList.map(biz => {
      cidMap[biz.cid] = cidMap[biz.cid] || {};
      cidMap[biz.cid].gmbBizList = cidMap[biz.cid].gmbBizList || [];
      cidMap[biz.cid].gmbBizList.push(biz);
    });

    const qmenuIdMap = {};
    restaurants.map(r => {
      qmenuIdMap[r._id] = r;
      if (r.googleListing && r.googleListing.cid) {
        cidMap[r.googleListing.cid] = cidMap[r.googleListing.cid] || {};
        cidMap[r.googleListing.cid].restaurants = cidMap[r.googleListing.cid].restaurants || [];
        cidMap[r.googleListing.cid].restaurants.push(r);
      }
    });

    // start migrating process: enabled: cid < qmenuId, if multiple, use assign to enabled only
    const updatedRestaurants = [];

    restaurants.map(r => {
      r.web = r.web || {};
      const before = JSON.stringify(r.web);
      if (r.websiteTemplateName) {
        r.web.templateName = r.web.templateName || r.websiteTemplateName
      }

      if (r.domain) {
        let url = r.domain.trim().toLowerCase();
        if (!url.startsWith('http')) {
          url = 'http://' + url;
        }
        r.web.qmenuWebsite = r.web.qmenuWebsite || url;
      }

      if (r.googleListing && r.googleListing.gmbOwner !== 'qmenu' && r.googleListing.gmbWebsite && !r.web.bizManagedWebsite) {
        r.web.bizManagedWebsite = r.googleListing.gmbWebsite;
      }

      if (JSON.stringify(r.web) !== before) {
        updatedRestaurants.push(r);
      }

    });

    const migrateFields = ['bizManagedWebsite', 'useBizWebsite', 'useBizWebsiteForAll', 'qmenuWebsite', 'qmenuPop3Password', 'ignoreGmbOwnershipRequest'];

    Object.keys(cidMap).map(cid => {
      let restaurants = cidMap[cid].restaurants || [];
      const gmbBizList = cidMap[cid].gmbBizList || [];
      if (restaurants.length > 1) {
        restaurants = restaurants.filter(r => !r.disabled);
      }

      restaurants.map(restaurant => {
        const web = restaurant.web || {};
        migrateFields.map(field => {
          let fieldValue = web[field];
          gmbBizList.map(biz => fieldValue = fieldValue || biz[field]);
          if (fieldValue) {
            web[field] = fieldValue;
          }
        });

        delete web.qmenuPop3Email;
        delete web.qmenuPop3Host;
        delete restaurant.domain;
        delete restaurant.websiteTemplateName;

        restaurant.web = web;
        updatedRestaurants.push(restaurant);

      });

    });


    console.log(updatedRestaurants.length);
    console.log(updatedRestaurants);
    // inject
    // updatedRestaurants.length = 1;
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', updatedRestaurants.map(r => ({
      old: { _id: r._id },
      new: { _id: r._id, web: r.web }
    }))).toPromise();

  }

  async migrateGmbOwnerships() {
    const gmbBizBatchSize = 3000;
    const allGmbBizList = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbBiz',
        query: {
          gmbOwnerships: { $exists: 1 },
        },
        projection: {
          _id: 1
        },
        skip: allGmbBizList.length,
        limit: gmbBizBatchSize
      }).toPromise();
      allGmbBizList.push(...batch);
      if (batch.length === 0 || batch.length < gmbBizBatchSize) {
        break;
      }
    }


    // batch
    const batchSize = 100;

    const batchedBizList = Array(Math.ceil(allGmbBizList.length / batchSize)).fill(0).map((i, index) => allGmbBizList.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batchedBizList) {
      const gmbBizbatchListSize = 3000;
      const gmbBizList = [];
      while (true) {
        const batchList = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'gmbBiz',
          query: {
            _id: { $in: batch.map(biz => ({ $oid: biz._id })) }
          },
          skip: gmbBizList.length,
          limit: gmbBizbatchListSize
        }).toPromise();
        gmbBizList.push(...batchList);
        if (batchList.length === 0 || batchList.length < gmbBizbatchListSize) {
          break;
        }
      }


      const gmbAccounts = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'gmbAccount',
        projection: {
          email: 1,
          locations: 1
        },
        limit: 6000
      }).toPromise();

      const emailAccountDict = gmbAccounts.reduce((map, account) => (map[account.email] = account, map), {});
      const emailStringifiedDict = gmbAccounts.reduce((map, account) => (map[account.email] = JSON.stringify(account), map), {});
      console.log(gmbBizList);

      const updatedAccounts = [];
      const fields = ['appealId', 'name', 'address', 'phone', 'cuisine', 'place_id', 'cid', 'reservations', 'menuUrls', 'orderAheadUrls'];
      for (let gmbBiz of gmbBizList) {
        const history = gmbBiz.gmbOwnerships || [];
        for (let i = 0; i < history.length; i++) {
          if (history[i].email) {
            const account = emailAccountDict[history[i].email];
            const matchedLocations = (account.locations || []).filter(loc => loc.cid === gmbBiz.cid);

            const status = history[i].status || 'Published';
            const myHistory = [{ time: history[i].possessedAt, status: status }];

            if (history[i + 1] && history[i + 1].email !== history[i].email) {
              myHistory.push({ time: history[i + 1].possessedAt, status: 'Removed' });
            }

            switch (matchedLocations.length) {
              case 0:
                account.locations = account.locations || [];
                const newLocation = fields.reduce((obj, field) => (obj[field] = gmbBiz[field], obj), {} as any);
                newLocation.website = gmbBiz['gmbWebsite'];
                newLocation.statusHistory = myHistory;

                account.locations.push(newLocation);
                updatedAccounts.push(account);
                break;

              default:
                // match appealId, otherwise just choose first match
                const appealIdMatched = matchedLocations.filter(loc => loc.appealId === gmbBiz.appealId);
                const matchedLocation = appealIdMatched[0] || matchedLocations[0];
                matchedLocation.statusHistory.push(...myHistory);
                updatedAccounts.push(account);
                break;
            }
          }
        }
      }


      // reorg location's history
      updatedAccounts.map(account => account.locations.map(loc => {
        // sort history Ascending
        loc.statusHistory.sort((h1, h2) => new Date(h1.time).valueOf() - new Date(h2.time).valueOf());
        // remove 'Removed' that's not the last one!
        loc.statusHistory = loc.statusHistory.filter((h, index) => (index === loc.statusHistory.length - 1) || h.status !== 'Removed');
        // remove sequential same status (keep old one)
        for (let i = loc.statusHistory.length - 1; i >= 1; i--) {
          if (loc.statusHistory[i - 1].status === loc.statusHistory[i].status) {
            loc.statusHistory.splice(i, 1);
          }
        }
        loc.statusHistory.reverse();
        loc.status = loc.statusHistory[0].status;
      }));
      // patch updated!
      const changedAccounts = updatedAccounts.filter(a => JSON.stringify(a) !== emailStringifiedDict[a.email]);
      const uniqueChangedAccounts = [...new Set(changedAccounts)];

      if (uniqueChangedAccounts.length > 0) {

        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=gmbAccount', uniqueChangedAccounts.map(a => ({
          old: { _id: a._id },
          new: { _id: a._id, locations: a.locations }
        }))).toPromise();
      } else {
        this._global.publishAlert(AlertType.Success, 'No new thing updated');
      }

    } // end batch
  } // end migration

  async cleanBingImages() {
    const restaurantIds = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      projection: {
        name: 1
      },
      limit: 6000
    }).toPromise();

    const batchSize = 20;
    const batchedIds = Array(Math.ceil(restaurantIds.length / batchSize)).fill(0).map((i, index) => restaurantIds.slice(index * batchSize, (index + 1) * batchSize));

    for (let batch of batchedIds) {
      const restaurants = (await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "restaurant",
        query: {
          _id: {
            $in: batch.map(rid => ({ $oid: rid._id }))
          }
        },
        projection: {
          name: 1,
          "menus.mcs.mis.imageObjs": 1
        },
        limit: batchSize
      }).toPromise()).map(r => new Restaurant(r));

      const badRestaurants = restaurants.filter(r => r.menus.some(menu => menu.mcs.some(mc => mc.mis.some(mi => mi.imageObjs.some(image => ((image.originalUrl || '').indexOf('bing') > 0 || (image.normalUrl || '').indexOf('bing') > 0 || (image.thumbnailUrl || '').indexOf('bing') > 0))))));
      console.log(badRestaurants);
      if (badRestaurants.length > 0) {
        // patch!
        const fixedRestaurant = function (restaurant) {
          const cloneOld = JSON.parse(JSON.stringify(restaurant));
          const cloneNew = JSON.parse(JSON.stringify(restaurant));
          cloneOld.menus.map(menu => menu.mcs.map(mc => mc.mis.map(mi => delete mi.imageObjs)));
          cloneNew.menus.map(menu => menu.mcs.map(mc => mc.mis.map(mi => {
            let indexArray = [];
            for (let i = 0; i < mi.imageObjs.length; i++) {
              if (mi.imageObjs[i]) {
                if ((mi.imageObjs[i].originalUrl || '').indexOf('bing') > 0 || (mi.imageObjs[i].normalUrl || '').indexOf('bing') > 0 || (mi.imageObjs[i].thumbnailUrl || '').indexOf('bing') > 0) {
                  indexArray.push(i);
                }
              }
            }

            for (var i = indexArray.length - 1; i >= 0; i--) {
              mi.imageObjs.splice(indexArray[i], 1);
            }

          })));
          return {
            old: cloneOld,
            new: cloneNew
          }
        }

        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', badRestaurants.map(r => ({
          old: fixedRestaurant(r).old,
          new: fixedRestaurant(r).new
        }))).toPromise();
      }

    }

  }

  async injectImages() {
    let restaurantIds = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "restaurant",
      query: {
        menus: { $exists: true }
      },
      projection: {
        name: 1,
        skipImageInjection: 1
      },
      limit: 6000
    }).toPromise();

    restaurantIds = restaurantIds.filter(r => !r.skipImageInjection);

    const images = await this._api.get(environment.qmenuApiUrl + "generic", {
      resource: "image",
      limit: 3000
    }).toPromise();

    const batchSize = 20;
    const batchedIds = Array(Math.ceil(restaurantIds.length / batchSize)).fill(0).map((i, index) => restaurantIds.slice(index * batchSize, (index + 1) * batchSize));

    try {
      for (let batch of batchedIds) {
        const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
          resource: 'restaurant',
          query: {
            _id: {
              $in: batch.map(rid => ({ $oid: rid._id }))
            }
          },
          projection: {
            name: 1,
            "menus": 1
          },
          limit: 6000
        }).toPromise();

        console.log('batch', batch);

        const patchList = restaurants.map(r => {
          const oldR = r;
          const newR = JSON.parse(JSON.stringify(r));
          //Just assuming match 1 image, and only upload image if none image exists
          newR.menus.map(menu => (menu.mcs || []).map(mc => (mc.mis || []).map(mi => {
            /* Image origin: "CSR", "RESTAURANT", "IMAGE-PICKER"
                only inject image when no existing image with origin as "CSR", "RESTAURANT", or overwrite images with origin as "IMAGE-PICKER"
            */
            try {
              if (mi && mi.imageObjs && !mi.imageObjs.some(each => each.origin === 'CSR' || each.origin === 'RESTAURANT')) {
                const match = function (aliases, name) {
                  const sanitizedName = Helper.sanitizedName(name);
                  return (aliases || []).some(alias => alias.toLowerCase().trim() === sanitizedName);
                }
                //only use the first matched alias
                let matchingAlias = images.filter(image => match(image.aliases, mi.name))[0];
                if (matchingAlias && matchingAlias.images && matchingAlias.images.length > 0) {
                  //reset the imageObj
                  mi.imageObjs = [];
                  (matchingAlias.images || []).map(each => {
                    (mi.imageObjs).push({
                      originalUrl: each.url,
                      thumbnailUrl: each.url192,
                      normalUrl: each.url768,
                      origin: 'IMAGE-PICKER'
                    });
                  })
                }
              }
            }
            catch (e) {
              //capture some mi abnormal case
              console.log(e);
              console.log('mi=', JSON.stringify(mi));
            }
          })));

          return ({
            old: { _id: oldR._id },
            new: { _id: newR._id, menus: newR.menus }
          });
        });
        console.log(patchList);

        await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', patchList).toPromise();
      }
    }

    catch (e) {
      console.log(e)
      console.log("Failed update restaurants=", batchedIds)
    }
  }

  async injectRequireZipBillingAddress() {
    const serviceSettings = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        googleListing: 1,
        serviceSettings: 1,
        requireZipcode: 1,
        requireBillingAddress: 1
      }
    }, 3000)

    let updatedRestaurantPairs = [];
    for (let r of serviceSettings) {
      const oldR = r;
      let newR = JSON.parse(JSON.stringify(r));
      if (r.serviceSettings && r.serviceSettings.some(each => each.paymentMethods.indexOf('QMENU') > -1)) {
        if (!newR.requireZipcode || !newR.requireBillingAddress) {
          newR.requireZipcode = true;
          updatedRestaurantPairs.push({
            old: {
              _id: r._id
            },
            new: newR
          });
        }
      }
    }

    console.log(updatedRestaurantPairs);
    if (updatedRestaurantPairs.length > 0) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', updatedRestaurantPairs).toPromise();
    }
  }

  async findQMenuCCRTs() {
    const serviceSettings = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        googleListing: 1,
        serviceSettings: 1,
        requireZipcode: 1,
        requireBillingAddress: 1,
        disabled: 1
      }
    }, 3000)

    let result = serviceSettings.filter(r => (!r.disabled && r.googleListing && r.googleListing.gmbOwner === "qmenu" && r.serviceSettings && r.serviceSettings.some(each => each.paymentMethods.indexOf('QMENU') > 0)));
    let rtIds = result.map(r => r._id);


    console.log("qMenu RTs=", rtIds);
    // console.log("qMenu RT IDs=", rtIds.slice(0,100));
    // console.log("qMenu RT IDs=", rtIds.slice(100,200));
    // console.log("qMenu RT IDs=", rtIds.slice(200, 300));
    // console.log("qMenu RT IDs=", rtIds.slice(300));


  }

  async calculateDomainValue() {

    const restaurants = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        name: 1,
        updatedAt: 1,
        'web.qmenuWebsite': 1,
        disabled: 1,
        alias: 1,
        score: 1,
      },
      limit: 6000
    }).toPromise();

    const goodList = [];
    const badList = [];
    //restaurants.length = 20;

    for (let r of restaurants) {
      if (r.disabled || !r.web || !r.web.qmenuWebsite || r.web.qmenuWebsite.startsWith('https') || r.web.qmenuWebsite.indexOf('qmenu.us') > 0) {
        continue;
      }
      const orders = await this._api.get(environment.qmenuApiUrl + "generic", {
        resource: "order",
        query: {
          restaurant: {
            $oid: r._id
          }
        },
        projection: {
          createdAt: 1
        },
        sort: { createdAt: -1 },
        limit: 300
      }).toPromise();

      const now = new Date().valueOf();
      const sixBuckets = Array(6).fill(0).map((i, index) => now - (index + 1) * 30 * 24 * 3600 * 1000).map(time => ({
        threshold: time,
        count: 0
      }));

      orders.map(order => {
        for (let i = 0; i < sixBuckets.length; i++) {
          const createdAt = new Date(order.createdAt || 0).valueOf();
          if (createdAt > sixBuckets[i].threshold) {
            sixBuckets[i].count = sixBuckets[i].count + 1;
            break;
          }
        }
      });

      console.log(r.name);
      console.log(sixBuckets);

      const sixMonthsTotal = sixBuckets.reduce((sum, bucket) => sum + bucket.count, 0) > 30;
      const last3MonthGreaterThan10 = sixBuckets[0].count + sixBuckets[1].count + sixBuckets[2].count >= 6;

      const extractDomain = function (url) {
        return url.replace('http://', '').replace('www.', '').toLowerCase().split('/')[0];
      };
      const item = {
        domain: extractDomain(r.web.qmenuWebsite),
        name: r.name,
        id: r._id,
        restaurant: r
      };
      if (sixMonthsTotal && last3MonthGreaterThan10) {
        goodList.push(item);
      } else {
        badList.push(item);
      }

    }

    goodList.sort((i1, i2) => i1.domain > i2.domain ? 1 : -1);


    console.log('good list:');
    console.log(goodList);
    console.log('bad list:');
    console.log(badList);

    const migrationDomains = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'migration',
      query: {
        // "steps.0.executions.0": { $exists: true },
        // "shrinked": { $exists: false }
      },
      projection: {
        domain: 1
      },
      limit: 8000
    }).toPromise();

    const filteredGoodList = goodList.filter(each => !migrationDomains.some(migration => migration.domain === each.domain));
    const existingGoodList = goodList.filter(each => migrationDomains.some(migration => migration.domain === each.domain));
    console.log('filteredGoodList', filteredGoodList);
    console.log('existingGoodList', existingGoodList);

    const valuableMigrations = filteredGoodList.map(each => (
      {
        domain: each.domain,
        steps: steps,
        restaurant: each.restaurant
      }
    ));

    console.log(valuableMigrations);
    await this._api.post(environment.qmenuApiUrl + 'generic?resource=migration', valuableMigrations).toPromise();


  }

  async deleteDomainData(type) {
    const batchSize = 1000;
    const domainList = [];
    while (true) {
      const batch = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: type,
        skip: domainList.length,
        limit: batchSize
      }).toPromise();
      domainList.push(...batch);
      if (batch.length === 0 || batch.length < batchSize) {
        break;
      }
    }

    let deleteBatchSize = 100;
    const batchedList = Array(Math.ceil(domainList.length / deleteBatchSize)).fill(0).map((i, index) => domainList.slice(index * deleteBatchSize, (index + 1) * deleteBatchSize));
    for (let batch of batchedList) {
      await this._api.delete(environment.qmenuApiUrl + "generic", {
        resource: type,
        ids: batch.map(r => r._id)
      });
    }

  }

  async getAwsAndGodaddyDomains() {
    ['domain'].map(type => this.deleteDomainData(type));
    let results = [];
    let awsDomainList = await this._api.get(environment.qmenuApiUrl + "utils/list-aws-domain").toPromise();

    awsDomainList.map(each => {
      let domain = new Domain();
      domain.name = each.DomainName;
      domain.autoRenew = each.AutoRenew;
      domain.expiry = each.Expiry;
      domain.type = "AWS";
      results.push(domain);
    })

    let godaddyDomainList = await this._api.get(environment.qmenuApiUrl + "utils/list-godaddy-domain").toPromise();
    godaddyDomainList.map(each => {
      let domain = new Domain();
      domain.name = each.domain;
      domain.autoRenew = each.renewAuto;
      domain.expiry = each.expires;
      domain.status = each.status;
      domain.type = "GODADDY";
      results.push(domain);
    })

    await this._api.post(environment.qmenuApiUrl + 'generic?resource=domain', results).toPromise();

  }

  async getRestaurantsHavingOrdersWithin() {
    let start = new Date();
    start.setDate(start.getDate() - 15);
    let to = new Date();

    const orders = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: "order",
      query: {
        $and: [
          {
            createdAt: {
              $gte: { $date: start }
            }
          },
          {
            createdAt: {
              $lte: { $date: to }
            }
          }
        ]
      },
      projection: {
        restaurant: 1,
        createdAt: 1,
        orderNumber: 1,
        rateSchedules: 1,
      },
    }, 3000);

    console.log(orders.length);
    let rtIds = orders.map(o => o.restaurant);

    rtIds = Array.from(new Set(rtIds));
    console.log(rtIds)


    const batchSize = 100;

    const batchedID = Array(Math.ceil(rtIds.length / batchSize)).fill(0).map((i, index) => rtIds.slice(index * batchSize, (index + 1) * batchSize));

    const restaurants = [];

    for (let batch of batchedID) {
      const batchedResult = await this._api.get(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        query: {
          _id: {
            $in: batch.map(b => ({ $oid: b }))
          }
        },
        projection: {
          _id: 1,
          'rateSchedules': 1
        },
        limit: batch.length
      }).toPromise();
      restaurants.push(...batchedResult);
    }

    let englishRts = restaurants.filter(r => r.rateSchedules.some(r => r.agent === 'charity')).map(e => e._id);
    let chineseRts = restaurants.filter(r => !r.rateSchedules.some(r => r.agent === 'charity')).map(e => e._id);

    console.log('englishRts', englishRts);
    console.log('chineseRts', chineseRts);

    let englishIdString = englishRts.join(',');
    let chineseIdString = chineseRts.join(',');
    console.log('englishIdString', englishIdString);
    console.log('chineseIdString', chineseIdString);
  }

  async getChineseOrEnglishRTs() {
    const RTs = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      projection: {
        _id: 1,
        disabled: 1,
        'rateSchedules': 1
      }
    }, 3000)



    let englishRts = RTs.filter(r => !r.disabled && r.rateSchedules && r.rateSchedules.some(r => r.agent === 'charity')).map(e => e._id);
    let chineseRts = RTs.filter(r => !r.disabled && r.rateSchedules && !r.rateSchedules.some(r => r.agent === 'charity')).map(e => e._id);
    console.log('englishRts length', englishRts.length);
    console.log('chineseRts', chineseRts.length);
    //console.log('englishRts', englishRts);
    //console.log('chineseRts', chineseRts);

    let englishIdString = englishRts.join(',');
    let chineseIdString = chineseRts.join(',');
    //console.log('englishIdString', englishIdString);
    console.log('chineseIdString', chineseIdString);

    FileSaver.saveAs(new Blob([JSON.stringify(chineseIdString)], { type: "text" }), 'data.txt');

  }

  async getRestaurantWithoutSingleDomain() {

    let restaurants = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: 'restaurant',
      projection: {
        name: 1,
        "googleListing.cid": 1,
        "googleListing.gmbOwner": 1,
        "googleListing.gmbWebsite": 1,
        "googleListing.gmbOpen": 1,
        "googleAddress.formatted_address": 1,
        web: 1,
        disabled: 1,
        score: 1,
      },
      sort: {
        updatedAt: 1
      }
    }, 3000);

    const accounts = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
      resource: 'gmbAccount',
      projection: {
        "email": 1,
        "locations.cid": 1,
        "locations.status": 1
      }
    }, 50)

    // create a cidMap
    const cidMap = {};

    //remove disabled RT
    restaurants = restaurants.filter(each => !each.disabled)

    restaurants.map(r => {
      if (r.googleListing && r.googleListing.cid) {
        cidMap[r.googleListing.cid] = cidMap[r.googleListing.cid] || {};
        cidMap[r.googleListing.cid].restaurants = cidMap[r.googleListing.cid].restaurants || [];
        cidMap[r.googleListing.cid].restaurants.push(r);
      }
    });



    let publishedRTs = [];
    accounts.map(account => (account.locations || []).map(loc => {
      // make Published overrule other status
      if (loc.status === 'Published') {
        if (cidMap[loc.cid] && cidMap[loc.cid].restaurants) {
          publishedRTs.push(...cidMap[loc.cid].restaurants);
        }
      }
    }));
    console.log(publishedRTs);

    let filteredRT1 = publishedRTs.filter(each => each.web && each.web.qmenuWebsite && each.web.qmenuWebsite.indexOf('qmenu.us') >= 0);
    console.log("qmenu.us RTs", filteredRT1);

    let filteredRT2 = publishedRTs.filter(each => each.web && each.web.qmenuWebsite && each.web.qmenuWebsite.indexOf('qmenu.us') < 0 && each.web.qmenuWebsite.indexOf('https') < 0);
    console.log("godaddy RTs", filteredRT2);

    console.log("qmenu.us RTs score >0", filteredRT1.filter(each => each.score > 0));
    console.log("godaddy RTs score >0", filteredRT2.filter(each => each.score > 0));

  }

  async getRTsClosedForLong() {

    let restaurants = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: 'restaurant',
      projection: {
        name: 1,
        _id: 1,
        closedHours: 1,
        disabled: 1,
        score: 1,
      },
      sort: {
        updatedAt: 1
      }
    }, 3000);


    let closedRT = []
    restaurants = restaurants.filter(r => !r.disabled)

    restaurants.forEach(e => {

      let closed = (e.closedHours || []).some(hour => {
        if (hour) {

          let from = new Date(hour.fromTime);
          let to = new Date(hour.toTime);

          let span = to.getTime() - from.getTime();
          if (span > 3 * 30 * 24 * 3600000) {
            return true;
          }
        }
      })

      if (closed) {
        closedRT.push(e._id);
      }



    });
    console.log('closedRT', closedRT)
  }

  async deletePastClosedHours() {
    let restaurants = await this._api.getBatch(environment.qmenuApiUrl + "generic", {
      resource: 'restaurant',
      projection: {
        name: 1,
        _id: 1,
        closedHours: 1,
        disabled: 1,
        score: 1,
      },
      sort: {
        updatedAt: 1
      }
    }, 3000);

    const updatedOldNewPairs = [];
    restaurants.map(r => {
      let updated = false;
      r.closedHours = r.closedHours || [];
      for (let i = r.closedHours.length - 1; i >= 0; i--) {
        console.log('rt', r._id);
        if (r.closedHours[i] && r.closedHours[i].toTime) {
          let toTime = new Date(r.closedHours[i].toTime);
          let now = new Date();
          let Difference_In_Time = now.getTime() - toTime.getTime();
          // To calculate the no. of days between two dates
          let Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);
          if (Difference_In_Days > 1) {
            r.closedHours.splice(i, 1);
            updated = true;
          }
        }
      }

      if (updated) {
        updatedOldNewPairs.push({
          old: { _id: r._id },
          new: { _id: r._id, closedHours: r.closedHours }
        });
      }
    });
    console.log(updatedOldNewPairs);
    if (updatedOldNewPairs.length > 0) {
      await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', updatedOldNewPairs).toPromise();
    }

  }









}


const steps = [
  {
    name: 'sendCode',
    payload: ['domain']
  },
  {
    name: 'getCode',
    payload: ['domain'],
  },
  {
    name: 'transferDomain',
    payload: ['domain', 'authCode'],
  },
  {
    name: 'checkTransferDomain',
    payload: ['OperationId'],
  },
  {
    name: 'transferS3',
    payload: ['domain'],
  },
  {
    name: 'requestCertificate',
    payload: ['domain'],
  },
  {
    name: 'checkCertificate',
    payload: ['domain', 'certificateARN'],
  },
  {
    name: 'createCloudFront',
    payload: ['domain', 'certificateARN'],
  },
  {
    name: 'checkCloudFront',
    payload: ['domain', 'distributionId'],
  },
  {
    name: 'validateWebsite',
    payload: ['domain'],
  },

  {
    name: 'setEmail',
    payload: ['domain'],
  },
];


