import { Pipe, PipeTransform } from '@angular/core';
 import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  name: 'sanitizeDom'
})
export class SanitizeDomPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) { }
  transform(url) {
      return this.sanitizer.bypassSecurityTrustHtml(url);
  }

}
