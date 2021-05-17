import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import {TimezoneHelper} from '@qmenu/ui';

if (environment.production) {
  enableProdMode();
}

TimezoneHelper.fixDateToLocaleStringPerformance();
platformBrowserDynamic().bootstrapModule(AppModule, {
  preserveWhitespaces: true
})
  .catch(err => console.log(err));
