import { map } from 'rxjs/operators';
import { AlertType } from './../../../classes/alert-type';
import { environment } from './../../../../environments/environment';
import { ApiService } from 'src/app/services/api.service';
import { GlobalService } from 'src/app/services/global.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
@Component({
  selector: 'app-schemas',
  templateUrl: './schemas.component.html',
  styleUrls: ['./schemas.component.css']
})
export class SchemasComponent implements OnInit {
  currentSchema: any;
  currentDbName: string;
  isCopiedToClipboard = false;
  schemas;
  dbNames = [];
  dataCount = 100;
  // full = [];
  @ViewChild('showAPIExampleModal') showAPIExampleModal: ModalComponent;
  constructor(private _api: ApiService, private _global: GlobalService) { }

  ngOnInit() {
    this.isCopiedToClipboard = false;
    this.schemas = this._global.superset; //we can use the superset to see the profile of a mongodb document
    this.dbNames = this._global.superset.map(s => s.dbName);
  }
  // open a modal to show an API example
  openShowAPIExampleModal() {
    this.showAPIExampleModal.show();
  }
  //update a schema when it is selected by dbName
  async updateSelectedSchema(currentSchema) {
    if (!currentSchema) {
      return alert('please select a json schema before!');
    } else {
      // try {
      //   const full = await this._api.get(`${environment.qmenuApiUrl}generic`, {
      //     resource: currentSchema.dbName,
      //     sort: { updatedAt: -1 },
      //     limit: this.dataCount
      //   }).toPromise();
      //   this.full = full.map(f=>f);
      //   this.currentSchema.example = this.full[0] || {};
      //   console.log(JSON.stringify(this.currentSchema.example));
      //   this.currentSchema.fullSchema = this.unionJson(full);
      //   console.log(JSON.stringify(this.currentSchema.example));
      //   this._global.superset.filter(s => s.dbName == currentSchema.dbName)[0]['fullSchema'] = this.currentSchema.fullSchema || {};
      //   this._global.superset.filter(s => s.dbName == currentSchema.dbName)[0]['example'] = this.currentSchema.example || {};
      //   console.log(JSON.stringify(this.currentSchema.example));
      //   console.log(JSON.stringify(this._global.superset.filter(s => s.dbName == currentSchema.dbName)[0]['example']));
      // } catch (e) {
      //   this._global.publishAlert(AlertType.Danger, JSON.stringify(e));
      // }
      try {
        const full = await this._api.get(`${environment.qmenuApiUrl}generic`, {
          resource: currentSchema.dbName,
          sort: { updatedAt: -1 },
          limit: this.dataCount
        }).toPromise();
        const temp = await this._api.get(`${environment.qmenuApiUrl}generic`, {
          resource: currentSchema.dbName,
          sort: { updatedAt: -1 },
          limit: 1
        }).toPromise();
        this.currentSchema.example = temp[0] || {};
        this.currentSchema.fullSchema = this.unionJson(full);
        this._global.superset.filter(s => s.dbName == currentSchema.dbName)[0]['fullSchema'] = this.currentSchema.fullSchema || {};
        this._global.superset.filter(s => s.dbName == currentSchema.dbName)[0]['example'] = this.currentSchema.example || {};
      } catch (e) {
        this._global.publishAlert(AlertType.Danger, JSON.stringify(e));
      }

    }
  }
  changeCollectionView() {
    this.schemas.forEach(schema => {
      if (schema.dbName == this.currentDbName) {
        this.currentSchema = schema;
      }
    });
  }

  /**
   * this function is used to prepare to go to json online website to view its format structure
   */
  copyToClipcboard(currentSchema) {
    if (!currentSchema) {
      return alert('please select a json schema before!');
    } else {
      let text = JSON.stringify(currentSchema.fullSchema);
      const handleCopy = (e: ClipboardEvent) => {
        // clipboardData 可能是 null
        e.clipboardData && e.clipboardData.setData('text/plain', text);
        e.preventDefault();
        // removeEventListener 要传入第二个参数
        document.removeEventListener('copy', handleCopy);
      };
      document.addEventListener('copy', handleCopy);
      document.execCommand('copy');
      this.isCopiedToClipboard = true;

      setTimeout(() => {
        this.isCopiedToClipboard = false;
      }, 1000);
    }
  }

  unionJson(jsonArray) {
    var model = {};
    for (let i = 0; i < jsonArray.length; i++) { //遍历整个文档
      var json = jsonArray[i];
      for (let j in json) { //遍历单个元素
        if (typeof (json[j]) == 'object') { //难点,如果当前
          this.loadTreeJson(json[j], j, model);
        } else {
          if (!model.hasOwnProperty(j)) { //当且仅当model 没有此元素时候赋值
            json[j] = "";
            model[j] = json[j];
          }
        }
      }
    }
    for (let i in model) {
      if (model[i] != "") {
        this.uniqueTreeJson(model[i]);
      }
    }
    return model;
  }

  //去重，得到独特键值对
  uniqueTreeJson(json) {
    if (this.isArray(json) && json.length > 0 && typeof (json[0]) == "string") { //第一种终极情况
      json.splice(0, json.length);
      json.push("");
    }
    for (let i in json) {
      if (json[i] != "") {
        this.uniqueTreeJson(json[i]);
      }
    }
    if (this.isArray(json) && json.length > 0 && typeof (json[0]) == "object") { //第二种终极情况
      var temp = [];
      for (let i = 0; i < json.length; i++) {
        var sub = json[i];
        var count = 0;
        for (var j in sub) {
          if (sub.hasOwnProperty(j)) {
            count++;
          }
        }
        temp.push(count);
      }
      var max = temp[0];
      var index = 0;
      for (let i = 0; i < temp.length; i++) {
        if (max < temp[i]) {
          max = temp[i];
          index = i;
        }
      }
      var remainObj = json[index];
      json.splice(0, json.length);
      json.push(remainObj);
    }
  }

  loadTreeJson(json, key, model) {
    if (typeof (json) == 'object') {
      if (model && model[key] == undefined) {
        model[key] = json;
      }
      for (let i in json) {
        if (json[i] && (typeof (json[i]) == "string" || typeof (json[i]) == "number" || typeof (json[i]) == "boolean" || json[i] == null)) {
          json[i] = "";
          if (model[key]) {
            // console.log('i:' + i);
            // console.log(JSON.stringify(model[key]));
            model[key][i] = json[i];
          }

        }
        if (this.isArray(json) && typeof (json[i]) != 'object') {

          if (model[key][i] && !model[key][i].hasOwnProperty(i)) {
            json[i] = "";
            model[key][i] = json[i]; //0,1,2 arr["image"][0]=""; 
          }
        } else {
          if (model[key]) {
            this.loadTreeJson(json[i], i, model[key]); //递归找到最深处 model[key] 很大概率是一个数组  object 0 "image" ... key
          }
        }
      }
    }
  }

  isArray(obj) {
    return Object.prototype.toString.call(obj) == "[object Array]";
  }





}
