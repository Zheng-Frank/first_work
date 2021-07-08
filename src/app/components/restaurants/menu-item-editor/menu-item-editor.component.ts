import { Component, OnInit, Input, Output, EventEmitter, OnChanges, ViewChild, ElementRef } from '@angular/core';
import { Mi, Item, MenuOption } from '@qmenu/ui';
import { SelectorComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { Helper } from '../../../classes/helper';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { HttpClient } from '@angular/common/http';

declare var $: any;
@Component({
    selector: 'app-menu-item-editor',
    templateUrl: './menu-item-editor.component.html',
    styleUrls: ['./menu-item-editor.component.scss']
})
export class MenuItemEditorComponent implements OnInit, OnChanges {
    mi: Mi;
    @Input() miNames: string[] = [];
    @Input() sizeNames: string[] = [];
    @Input() menuOptions: MenuOption[] = [];
    @Input() mcSelectedMenuOptionIds = [];

    @Output() onDelete = new EventEmitter();
    @Output() onDone = new EventEmitter();
    @Output() onCancel = new EventEmitter();

    @Output() onVisitMenuOptions = new EventEmitter();

    @ViewChild('spicySelector') spicySelector: SelectorComponent;
    @ViewChild('sourSelector') sourSelector: SelectorComponent;
    @ViewChild('sweetSelector') sweetSelector: SelectorComponent;
    @ViewChild('startupActionSelector') startupActionSelector: SelectorComponent;

    uploadImageError: string;
    availabilityValues = ['Available', 'Unavailable'];

    startupAction = undefined;  //'Yes', 'No', or undefined
    finishedChoosingStartupAction = false;
    existingMis = [];

    showDetails = false;
    searchText = null;

    constructor(private _router: Router, private _api: ApiService, private _http: HttpClient) {

    }
    ngOnInit() {
    }

    ngOnChanges(params) {
    }
    /**
     * it needs to show old pepper's count.
     * @param mi
     */
    getSpicy(mi) {
        if (mi.flavors && mi.flavors['Spicy']) {
            let pepperCounts = [];
            pepperCounts.push(Array.apply(null, { length: +this.mi.flavors['Spicy'] }).map(Number.call, Number).length);
            return pepperCounts;
        }
        return undefined;
    }

    getSweet(mi){
        if (mi.flavors && mi.flavors['Sweet']) {
            let sweetCounts = [];
            sweetCounts.push(Array.apply(null, { length: +this.mi.flavors['Sweet'] }).map(Number.call, Number).length);
            return sweetCounts;
        }
        return undefined;
    }

    getSour(mi){
        if (mi.flavors && mi.flavors['Sour']) {
            let sourCounts = [];
            sourCounts.push(Array.apply(null, { length: +this.mi.flavors['Sour'] }).map(Number.call, Number).length);
            return sourCounts;
        }
        return undefined;
    }

    startupActionSelected(value) {

        if (value === 'Yes') {   // Copy

        } else {  // Not Copy
            this.finishedChoosingStartupAction = true;
        }
        this.startupAction = value;
    }

    selectMi(mi) {
        // create a copy of selected Mi and assign old category to it
        const category = this.mi.category;
        this.mi = new Mi(mi);
        this.mi.id = undefined;
        this.mi.category = category;

        this.finishedChoosingStartupAction = true;
        // we want to top of the modal after a selection
        $('.modal').animate({ scrollTop: 0 }, 'slow');
    }

    getAvailability() {
        return this.mi.disabled ? this.availabilityValues[1] : this.availabilityValues[0];
    }

    onSelectAvailability(params) {
        this.mi.disabled = !!this.availabilityValues.indexOf(params);
    }

    setMi(mi: Mi, menuOptions: MenuOption[], mcSelectedMenuOptionIds) {
        this.menuOptions = menuOptions || [];
        this.mcSelectedMenuOptionIds = mcSelectedMenuOptionIds || [];
        this.mi = mi;
        //reset other values
        this.startupAction = undefined;  //'Yes', 'No', or undefined
        this.finishedChoosingStartupAction = false;
        this.showDetails = false;
        // reset selectors, possibly not in view yet, so use setTimeout
        setTimeout(() => {
            [this.spicySelector, this.sourSelector, this.sweetSelector, this.startupActionSelector].forEach(selector => {
                if (selector) {
                    selector.selectedValues = [];
                    if (this.mi.flavors && this.mi.flavors[selector.name]) {
                        selector.selectedValues.push(this.mi.flavors[selector.name]);
                    }
                }
            });
        }, 0);
    }

    getSearchedMis() {
        if (this.searchText) {
            let filtered = this.existingMis.filter(mi => mi.name.toLowerCase().indexOf(this.searchText.toLowerCase()) >= 0);
            return filtered;
        }
        return this.existingMis;
    }

    setExistingMis(mis) {
        this.existingMis = mis;
    }

    deleteImage(img) {
        this.mi.imageObjs.splice(this.mi.imageObjs.indexOf(img), 1);
    }

    async onUploadImageChange(event) {
        this.uploadImageError = undefined;
        let files = event.target.files;
        try {
            const data: any = await Helper.uploadImage(files, this._api, this._http);
            if (data && data.Location) {
                this.mi.imageObjs = this.mi.imageObjs || [];
                // infer 3 Urls
                this.mi.imageObjs.push({
                    originalUrl: data.Location,
                    thumbnailUrl: Helper.getThumbnailUrl(data.Location),
                    normalUrl: Helper.getNormalResUrl(data.Location),
                    origin: 'CSR'
                });
            }
            else {
                console.log("The data was null");
            }
        }
        catch (err) {
            this.uploadImageError = err;
        }

    }

    toggleFlavors() {
        if (this.mi.flavors) {
            this.mi.flavors = undefined;
            // clean the flavor selectors
        } else {
            this.mi.flavors = {};
        }
    }

    toggleCustomizable() {
        this.mi.nonCustomizable = !this.mi.nonCustomizable;
    }

    isValid() {
        return this.mi.name && this.areSizeOptionsValid();
    }

    areSizeOptionsValid(): boolean {
        let valid = true;
        if (this.mi.sizeOptions) {
            this.mi.sizeOptions.forEach((i: Item) => {
                if (i.name && !(+i.price >= 0)) {
                    valid = false;
                }
            });
        }
        return valid;
    }
    validationMessage() {
        if (!this.mi.name) {
            return 'name is missing';
        }
        if (!this.areSizeOptionsValid()) {
            return 'item price not valid';
        }
        return undefined;
    }

    ok() {
        // make sure the inventory value is a number!
        if (typeof this.mi.inventory !== 'number') {
            this.mi.inventory = null;
        }
        // sanitize size options
        if (this.mi.sizeOptions) {
            for (let i = this.mi.sizeOptions.length - 1; i >= 0; i--) {
                if (!this.mi.sizeOptions[i].name || !(+this.mi.sizeOptions[i].price >= 0)) {
                    this.mi.sizeOptions.splice(i, 1);
                }
            }
        }

        // get or remove flavors!
        if (this.mi.flavors) {
            [this.spicySelector, this.sweetSelector, this.sourSelector].forEach(selector => {
                if (selector) {
                    if (selector.getFirstSelectedValue()) {
                        this.mi.flavors[selector.name] = selector.getFirstSelectedValue();
                    } else {
                        delete this.mi.flavors[selector.name];
                    }
                }
            });
        }

        // let's remove empty menuOptionIds
        if (this.mi.menuOptionIds && this.mi.menuOptionIds.length === 0) {
            delete this.mi.menuOptionIds;
        }
        this.onDone.emit(Helper.trim(this.mi));
    }

    cancel() {
        this.onCancel.emit(this.mi);
    }

    delete() {
        this.onDelete.emit(this.mi);
    }

    gotoMenuOptions() {
        this.onVisitMenuOptions.emit();
    }
    toggleMenuOption(mo: MenuOption) {
        this.mi.menuOptionIds = this.mi.menuOptionIds || [];
        if (this.mi.menuOptionIds.some(moId => moId === mo.id)) {
            this.mi.menuOptionIds = this.mi.menuOptionIds.filter(moId => moId !== mo.id);
        } else {
            this.mi.menuOptionIds.push(mo.id);
        }
    }

    isMenuOptionSelected(mo: MenuOption) {
        return this.mi.menuOptionIds && this.mi.menuOptionIds.some(moId => moId === mo.id);
    }

    isMenuOptionSelectedInMc(mo: MenuOption) {
        return this.mcSelectedMenuOptionIds && this.mcSelectedMenuOptionIds.some(moId => moId === mo.id);
    }


    menuOptionIdsChange() {
        if (this.mi.menuOptionIds) {
            this.mi.menuOptionIds = undefined;
        } else {
            this.mi.menuOptionIds = [];
        }
    }
}
