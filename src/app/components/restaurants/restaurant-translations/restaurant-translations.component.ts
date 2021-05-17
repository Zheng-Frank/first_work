/**
 * EN: extracted from orignal data sources, such as names or descriptions
 * 3 scenarios:
 * A. having translations
 * B. not having any translations
 * C. some translations are out-dated because original things have changed
 */
import { Component, Input, OnInit } from '@angular/core';
import { Restaurant } from '@qmenu/ui';
import { ApiService } from 'src/app/services/api.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-restaurant-translations',
  templateUrl: './restaurant-translations.component.html',
  styleUrls: ['./restaurant-translations.component.css']
})
export class RestaurantTranslationsComponent implements OnInit {
  @Input() restaurant: Restaurant;

  LANGUAGES = {
    EN: 'English',
    ZH: '中文',
    // ES: 'Spanish'
    // more can be added here in future
  };
  translationItems = [];

  constructor(private _api: ApiService) { }

  ngOnInit() {
    this.populateTranslations();
  }

  private extractTranslatingTexts() {
    const items = new Set();
    // add restaurant name
    items.add(this.restaurant.name);
    // add menu related
    this.restaurant.menus.map(menu => {
      items.add(menu.name);
      items.add(menu.description);
      menu.mcs.map(mc => {
        items.add(mc.name);
        items.add(mc.description);
        mc.mis.map(mi => {
          items.add(mi.name);
          items.add(mi.description);
          mi.sizeOptions.map(so => {
            items.add(so.name);
          });
        });
      });
    });
    // add menuOptions!
    (this.restaurant.menuOptions || []).map(mo => {
      items.add(mo.name);
      (mo.items || []).map(i => items.add(i.name));
      (mo.items || []).map(i => items.add(i.placement));
    });
    return items;
  }

  get nonEnglishLanguages() {
    return Object.keys(this.LANGUAGES).filter(k => k !== 'EN');
  }

  private async save() {
    // first, trim
    this.translationItems.forEach(t => {
      this.nonEnglishLanguages.map(lang => {
        t[lang] = (t[lang] || '').trim();
      });
    });

    const nonEmptyTranslations = this.translationItems.filter(t => this.nonEnglishLanguages.some(lang => t[lang]));
    await this._api.patch(environment.qmenuApiUrl + 'generic?resource=restaurant', [
      {
        old: { _id: this.restaurant._id },
        new: { _id: this.restaurant._id, translations: nonEmptyTranslations }
      }
    ]).toPromise();
  }

  private async populateTranslations() {
    const [rt] = await this._api.get(environment.qmenuApiUrl + 'generic', {
      resource: 'restaurant',
      query: { _id: { $oid: this.restaurant._id } },
      projection: {
        translations: 1
      }
    }).toPromise();
    const rtTranslations = rt.translations || [];
    // construct translation items here
    const currentAllTexts = [...this.extractTranslatingTexts()].filter(t => t);

    // either matched translation or new item
    const items = currentAllTexts.map(text => rtTranslations.find(t => t.EN === text) || { EN: text });
    this.translationItems = items;
  }

  async autoTranslate() {
    // get ALL restaurant's translations and match
    try {
      const restaurants = await this._api.getBatch(environment.qmenuApiUrl + 'generic', {
        resource: 'restaurant',
        projection: {
          translations: 1
        }
      }, 20000);

      // build a dict, which may contain EN, ZH, ES, etc
      const dict = {};
      restaurants.map(rt => (rt.translations || []).map(t => {
        dict[t.EN.toLowerCase()] = dict[t.EN.toLowerCase()] || t;
        Object.assign(dict[t.EN.toLowerCase()], t);
      }));
      this.translationItems.map(item => {
        const key = item.EN.toLowerCase();
        const translation = dict[key];
        if (translation) {
          this.nonEnglishLanguages.map(lang => {
            item[lang] = item[lang] || translation[lang];
          });
        }
      });
      this.save();
    } catch (error) {
      alert('ERROR: please tell your manager about the error');
    }
  }
}
