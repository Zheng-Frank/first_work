import { Component, OnInit, Input, Output, EventEmitter, OnChanges, ViewChild, ElementRef } from '@angular/core';
import { Mi, Item, MenuOption } from '@qmenu/ui';
import { SelectorComponent } from '@qmenu/ui/bundles/qmenu-ui.umd';
import { Helper } from '../../../classes/helper';
import { Router, NavigationStart } from '@angular/router';

declare var $: any;
@Component({
    selector: 'app-menu-item-editor',
    templateUrl: './menu-item-editor.component.html',
    styleUrls: ['./menu-item-editor.component.css']
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

    constructor(private _router: Router) {

    }
    ngOnInit() {
    }

    ngOnChanges(params) {
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
        this.mi.sortOrder = undefined;

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

    onUploadImageChange(event) {
        this.uploadImageError = undefined;
        let files = event.target.files;
        Helper.uploadImage(files, (err, data) => {
            this.mi.imageObjs = this.mi.imageObjs || [];
            if (err) {
                this.uploadImageError = err;
            } else if (data && data.Location) {
                // infer 3 Urls
                this.mi.imageObjs.push({
                    originalUrl: data.Location,
                    thumbnailUrl: Helper.getThumbnailUrl(data.Location),
                    normalUrl: Helper.getNormalResUrl(data.Location),
                    origin: 'USER'
                });
            }
        });
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
                if (i.name && !(+i.price > 0)) {
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
                if (!this.mi.sizeOptions[i].name || !this.mi.sizeOptions[i].price) {
                    this.mi.sizeOptions.splice(i, 1);
                }
            }
        }

        // get or remove flavors!
        if (this.mi.flavors) {
            [this.spicySelector, this.sweetSelector, this.sourSelector].forEach(selector => {
                if (selector.getFirstSelectedValue()) {
                    this.mi.flavors[selector.name] = selector.getFirstSelectedValue();
                } else {
                    delete this.mi.flavors[selector.name];
                }
            });
        }

        // let's remove empty menuOptionIds
        if (this.mi.menuOptionIds && this.mi.menuOptionIds.length === 0) {
            delete this.mi.menuOptionIds;
        }

        this.onDone.emit(this.mi);
    }

    cancel() {
        this.onCancel.emit(this.mi);
    }

    delete() {
        this.onDelete.emit(this.mi);
    }

    gotoMenuOptions() {
        // clear popup, then go!
        const modals = $('.modal');
        const self = this;
        if (modals && modals.hasClass('in')) {
            modals.on('hidden.bs.modal', function () {
                modals.off('hidden.bs.modal');
                self._router.navigate(['/menu-options']);
            });
            modals.modal('hide');
        } else {
            self._router.navigate(['/menu-options']);
        }
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
