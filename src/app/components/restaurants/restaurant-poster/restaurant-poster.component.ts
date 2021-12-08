import {Component, Input, OnInit} from '@angular/core';
import {Restaurant} from '@qmenu/ui';
import QRCode from 'qrcode';
import {GlobalService} from '../../../services/global.service';
import {AlertType} from '../../../classes/alert-type';

class TextOverflowError extends Error {
  constructor(label, message?) {
    super(message || (label + ' is too long!'));
    this.name = 'TextOverflowError';
    this.label = label;
  }
  code = 'TEXT_OVERFLOW';
  label: string;
}

@Component({
    selector: 'app-restaurant-poster',
    templateUrl: './restaurant-poster.component.html',
    styleUrls: ['./restaurant-poster.component.css']
})
export class RestaurantPosterComponent implements OnInit {

    @Input() restaurant: Restaurant;

    constructor(private _global: GlobalService) {
    }

    name = '';
    orderText = 'Order Online';
    version = 'chinese';
    versions = ['chinese', 'pizza', 'sushi', 'burger']
    showAddress = false;
    showPhone = false;
    website = '';
    address = '';
    phone = '';
    loading = false;

    loadImage(src): Promise<HTMLImageElement> {
      return new Promise((resolve, reject) => {
          let img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src
      });
    }

    pureWebsite(url) {
      return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    }

    ngOnInit() {
        let {web, name, googleAddress: {formatted_address}, channels} = this.restaurant;
        this.name = name;
        this.address = formatted_address.replace(', USA', '')
        let phones = channels.filter(x => x.type === 'Phone');
        let bizPhone = phones.find(x => x.notifications.includes('Business')) || phones[0];
        if (bizPhone) {
          this.phone = bizPhone.value;
        }
        if (web) {
            let {bizManagedWebsite, qmenuWebsite} = web;
            if (bizManagedWebsite) {
              this.website = this.pureWebsite(bizManagedWebsite);
            }
            if (qmenuWebsite && qmenuWebsite !== bizManagedWebsite) {
              this.website = this.pureWebsite(qmenuWebsite);
            }
        }
    }

    breakLine(ctx, fontSize, text, max) {
        ctx.font = this.getFont(fontSize);
        let lines = [], line = [];
        text.split(' ').forEach(word => {
            line.push(word);
            if (ctx.measureText(line.join(' ')).width > max) {
                line.pop();
                lines.push(line.join(' '));
                line = [word];
            }
        });
        lines.push(line.join(' '));
        return lines;
    }

    getFont(size) {
        return `bolder ${size}px broadway`;
    }

    findAppropriateFontSizeAndTop(ctx, topOffset, maxWidth) {

        let text = this.name;
        let minTop = 300, maxTop = 1300 + topOffset;
        let minFont = 250, maxFont = 620;

        let fontSize = maxFont,
            lines = this.breakLine(ctx, fontSize, text, maxWidth);
        let height = lines.length * fontSize * 1.2;

        while (height > maxTop - minTop && fontSize >= minFont) {
            fontSize -= 10;
            lines = this.breakLine(ctx, fontSize, text, maxWidth);
            height = lines.length * fontSize * 1.2;
        }

        let top = minTop + (maxTop - minTop - lines.length * fontSize * 1.2) / 2;

        if (height > maxTop - minTop) {
          throw new TextOverflowError('restaurant name')
        }

        return {top, fontSize, lines};

    }

    drawName(ctx, topOffset, maxWidth) {
        let padding = 200;
        let {top, fontSize, lines} = this.findAppropriateFontSizeAndTop(ctx, topOffset, maxWidth - padding * 2);
        lines.forEach(line => {
            let left = padding + (maxWidth - padding * 2 - ctx.measureText(line).width) / 2;
            ctx.fillText(line, left, top);
            top += fontSize * 1.2;
        });
    }

    async drawWebsite(ctx, top, website, maxWidth) {
        website = this.pureWebsite(website);
        let fontSize = 300, topOffset = 0;
        ctx.font = `bold ${fontSize}px Leelawadee UI`;
        let textWidth = ctx.measureText(website).width;
        let iconRatio = 675 / 403, iconMargin = 300;
        let left = (maxWidth - textWidth) / 2;
        let iconWidth = fontSize * iconRatio;
        while (iconWidth + iconMargin > left) {
            fontSize -= 10;
            iconMargin -= 20;
            if (iconMargin <= 20) {
                iconMargin += 20;
            }
            ctx.font = `bold ${fontSize}px Leelawadee UI`;
            textWidth = ctx.measureText(website).width;
            left = (maxWidth - textWidth) / 2;
            iconWidth = fontSize * iconRatio;
            topOffset += 10;
        }

        if (fontSize < 100) {
          throw new TextOverflowError('restaurant website')
        }

        ctx.fillText(website, left, top + topOffset);

        let image = await this.loadImage('/assets/images/poster-order.jpg');
        ctx.drawImage(image, left - iconMargin - iconWidth, top + topOffset, iconWidth, fontSize);
        image.remove();

        return topOffset;

    }

    async drawQrCode(ctx, maxWidth) {
        let size = 1800;
        let canvas = await QRCode.toCanvas(this.website, {width: size, margin: 1, errorCorrectionLevel: 'M'});
        ctx.drawImage(canvas, (maxWidth - size) / 2, 2930);
        canvas.remove();
    }

    narrowFont(ctx, maxWidth, text, fontSize, fontFamily, offset?) {
      ctx.font = `bolder ${fontSize}px ${fontFamily}`;
      let textWidth = ctx.measureText(text).width;
      while (textWidth >= maxWidth) {
        fontSize -= 10;
        ctx.font = `bolder ${fontSize}px ${fontFamily}`;
        textWidth = ctx.measureText(text).width;
        if (offset !== undefined) {
          offset += 10;
        }
      }
      let left = (maxWidth - textWidth) / 2;
      return { left, offset };
    }

    drawAddress(ctx, maxWidth, topOffset) {
      let {left, offset } = this.narrowFont(ctx, maxWidth, this.address, 250, 'BritannicBold', topOffset);
      ctx.fillText(this.address, left, 1400 + offset);
    }

    drawPhone(ctx, maxWidth, topOffset) {
      let digits = this.phone.split('');
      digits.splice(6, 0, '-')
      digits.splice(3, 0, '-')
      let formatted = digits.join('');
      let { left, offset } = this.narrowFont(ctx, maxWidth, formatted, 300, 'BritannicBold', topOffset);
      ctx.fillText(formatted, left, 1900 + offset);
    }

    async draw(ctx, maxWidth) {

        await this.drawQrCode(ctx, maxWidth);
        ctx.fillStyle = 'rgb(100, 27, 21)';
        ctx.textBaseline = 'top';

        // draw domain
        let topBase = 2300;
        let topOffset = await this.drawWebsite(ctx, topBase, this.website, maxWidth);

        if (this.showAddress) {
          this.drawAddress(ctx, maxWidth, topOffset);
        }
        if (this.showPhone) {
          this.drawPhone(ctx, maxWidth, topOffset);
        }
        if (!this.showAddress && !this.showPhone) {
          // draw order online
          ctx.font = 'bolder 250px broadway';
          let { left } = this.narrowFont(ctx, maxWidth, this.orderText, 250, 'broadway');
          ctx.fillText(this.orderText, left, 1800 + topOffset);
        }

        // draw name
        this.drawName(ctx, topOffset, maxWidth);

    }

    canDownload() {
      let finished = this.name && this.website;
      if (this.showAddress) {
        finished = finished && this.address;
      }
      if (this.showPhone) {
        finished = finished && this.phone;
      }
      if (!this.showAddress && !this.showPhone) {
        finished = finished && this.orderText;
      }
      return finished;
    }

    async download() {
        this.loading = true;
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        let image = await this.loadImage(`/assets/images/poster-${this.version}.jpg`);
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        ctx.drawImage(image, 0, 0);
        try {
            await this.draw(ctx, image.naturalWidth);
            const link = document.createElement('a')
            link.setAttribute('download', this.name + '.jpg');
            link.setAttribute('href', canvas.toDataURL('image/jpg'))
            link.click();
            link.remove();
            ctx.clearRect(0, 0, canvas.width, canvas.height)
        } catch (e) {
            console.log(e);
            if (e.code === 'TEXT_OVERFLOW') {
              this._global.publishAlert(AlertType.Danger, e.message)
            } else {
              this._global.publishAlert(AlertType.Danger, 'Poster generate failed.');
            }
        } finally {
            image.remove();
            this.loading = false;
        }
    }
}
