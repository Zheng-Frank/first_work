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

    websites = [];
    website = '';
    loading = false;

    loadImage(src): Promise<HTMLImageElement> {
      return new Promise((resolve, reject) => {
          let img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src
      });
    }

    ngOnInit() {
        this.websites = [];
        let {web} = this.restaurant;
        if (web) {
            let {bizManagedWebsite, qmenuWebsite} = web;
            if (bizManagedWebsite) {
                this.websites.push(bizManagedWebsite);
            }
            if (qmenuWebsite && qmenuWebsite !== bizManagedWebsite) {
                this.websites.push(qmenuWebsite);
            }
        }
        if (this.websites.length === 1) {
            this.website = this.websites[0];
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
        return `bolder ${size}px broadway, monospace`;
    }

    findAppropriateFontSizeAndTop(ctx, topOffset, maxWidth) {

        let text = this.restaurant.name;
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
        let fontSize = 300, topOffset = 0;
        ctx.font = `${fontSize}px monospace`;
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
            ctx.font = `${fontSize}px monospace`;
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

    async draw(ctx, maxWidth) {

        await this.drawQrCode(ctx, maxWidth);
        ctx.fillStyle = 'rgb(100, 27, 21)';
        ctx.textBaseline = 'top';

        // draw domain
        let topBase = 2300;
        let topOffset = await this.drawWebsite(ctx, topBase, this.website, maxWidth);

        // draw order online
        ctx.font = 'bolder 250px broadway, monospace';
        let orderText = 'Order Online';
        let textWidth = ctx.measureText(orderText).width;
        let left = (maxWidth - textWidth) / 2;
        ctx.fillText(orderText, left, 1800 + topOffset);

        // draw name
        this.drawName(ctx, topOffset, maxWidth);

    }


    async download() {
        this.loading = true;
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        let image = await this.loadImage('/assets/images/poster.jpg');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        ctx.drawImage(image, 0, 0);
        try {
            await this.draw(ctx, image.naturalWidth);
            const link = document.createElement('a')
            link.setAttribute('download', this.restaurant.name + '.jpg');
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

        image.src = '/assets/images/poster.jpg';
    }
}
