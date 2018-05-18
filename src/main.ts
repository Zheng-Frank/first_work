import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// let's define a function that will be used to translate current user time view to target timezone
Date.prototype['clone'] = function (offsetHours) {
  const cloned = new Date(this.getTime());
  if (offsetHours) {
    cloned.setHours(cloned.getHours() + offsetHours);
  }
  return cloned;
};

Date.prototype['yyyy-mm-dd'] = function () {
  const mm = this.getMonth() + 1; // getMonth() is zero-based
  const dd = this.getDate();

  return [this.getFullYear(),
  (mm > 9 ? '' : '0') + mm,
  (dd > 9 ? '' : '0') + dd
  ].join('-');
};

// returns date string from the restaurant's observer
Date.prototype['restaurant yyyy-mm-dd'] = function (restaurantOffsetToEST) {
  restaurantOffsetToEST = restaurantOffsetToEST || 0;
  // hours difference between restaurant and browser
  const jan = new Date(this.getFullYear(), 0, 1);
  const browserHoursAhead = 5 - restaurantOffsetToEST - jan.getTimezoneOffset() / 60;
  const cloned = new Date(this.getTime());
  cloned.setHours(cloned.getHours() - browserHoursAhead);
  const mm = cloned.getMonth() + 1; // getMonth() is zero-based
  const dd = cloned.getDate();

  return [cloned.getFullYear(),
  (mm > 9 ? '' : '0') + mm,
  (dd > 9 ? '' : '0') + dd
  ].join('-');
};

// returns time string from the restaurant's observer (11:30 AM)
Date.prototype['restaurant hh:MM a'] = function (restaurantOffsetToEST) {
  restaurantOffsetToEST = restaurantOffsetToEST || 0;
  // hours difference between restaurant and browser
  const jan = new Date(this.getFullYear(), 0, 1);
  const browserHoursAhead = 5 - restaurantOffsetToEST - jan.getTimezoneOffset() / 60;
  const cloned = new Date(this.getTime());
  cloned.setHours(cloned.getHours() - browserHoursAhead);
  const h = cloned.getHours();
  const m = cloned.getMinutes();
  return (h % 12 || 12) + ':' + (m < 10 ? '0' + m : m) + ' ' + (h < 12 ? 'AM' : 'PM');
};

// this function parse yyyy-mm-dd literal time string to restaurant observer
Date['parseRestaurantDate'] = function (dateString, restaurantOffsetToEST) {
  restaurantOffsetToEST = restaurantOffsetToEST || 0;
  const parsed = new Date(dateString); // -> absolute date 2001-05-11
  const jan = new Date(parsed.getFullYear(), 0, 1);
  const browserHoursAhead = 5 - restaurantOffsetToEST - jan.getTimezoneOffset() / 60;
  parsed.setHours(parsed.getHours() + parsed.getTimezoneOffset() / 60 + browserHoursAhead);
  return parsed;
};

Date.prototype['toRestaurantDate'] = function (restaurantOffsetToEST) {
  restaurantOffsetToEST = restaurantOffsetToEST || 0;
  const jan = new Date(this.getFullYear(), 0, 1);
  const browserHoursAhead = 5 - restaurantOffsetToEST - jan.getTimezoneOffset() / 60;
  const cloned = new Date(this.getTime());
  cloned.setHours(cloned.getHours() + browserHoursAhead);
  return cloned;
};


platformBrowserDynamic().bootstrapModule(AppModule, {
  preserveWhitespaces: true
})
  .catch(err => console.log(err));
