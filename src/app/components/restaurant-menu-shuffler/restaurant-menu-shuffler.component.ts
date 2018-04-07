import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Restaurant, Menu } from '@qmenu/ui';

@Component({
  selector: 'app-restaurant-menu-shuffler',
  templateUrl: './restaurant-menu-shuffler.component.html',
  styleUrls: ['./restaurant-menu-shuffler.component.scss']
})
export class RestaurantMenuShufflerComponent implements OnInit, OnChanges {

  @Input() restaurant1: Restaurant;
  @Input() restaurant2: Restaurant;

  restaurant1Clone: Restaurant;
  restaurant2Clone: Restaurant;
  allOldMcs = [];
  allNewMcs = [];
  reorganizedMenus = [];  // {name, oldHours, oldMcs, newMcs, newHours}, each mc: {name, selected}
  constructor() { }

  ngOnInit() {

  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.restaurant1 && this.restaurant2) {
      this.restaurant1Clone = new Restaurant(JSON.parse(JSON.stringify(this.restaurant1)));
      this.restaurant2Clone = new Restaurant(JSON.parse(JSON.stringify(this.restaurant2)));
      // rename menu-option-id if there is collasion
      this.restaurant1Clone.menuOptions.map(mo1 => {
        if (this.restaurant2Clone.menuOptions.some(mo2 => mo2.id == mo1.id)) {
          // attach something to make mo1.id unique!
          const uid = mo1.id + '' + new Date().valueOf();
          this.restaurant1Clone.menus.map(menu => menu.mcs.map(mc => {
            for (let i = 0; i < (mc.menuOptionIds || []).length; i++) {
              if (mc.menuOptionIds[i] === mo1.id) {
                mc.menuOptionIds[i] = uid;
              }
            }
            mc.mis.map(mi => {
              for (let i = 0; i < (mi.menuOptionIds || []).length; i++) {
                if (mi.menuOptionIds[i] === mo1.id) {
                  mi.menuOptionIds[i] = uid;
                }
              }
            });
          }));
          mo1.id = uid;
        }
      });

      this.allOldMcs = [];
      this.allNewMcs = [];

      this.restaurant1Clone.menus.map(menu => menu.mcs.map(mc => this.allOldMcs.push(mc)));
      this.restaurant2Clone.menus.map(menu => menu.mcs.map(mc => this.allNewMcs.push(mc)));

      this.reorganizedMenus.length = 0;

      this.reorganizedMenus = this.reorganizedMenus.concat(
        this.restaurant1Clone.menus.map(menu => ({
          name: menu.name,
          oldMcSelections: this.allOldMcs.map(mc => ({
            mc: mc,
            selected: menu.mcs.indexOf(mc) >= 0
          })),
          newMcSelections: this.allNewMcs.map(mc => ({
            mc: mc,
            selected: false
          })),
          inheritOthersFrom: menu
        }))
      );

      this.reorganizedMenus = this.reorganizedMenus.concat(
        this.restaurant2Clone.menus.map(menu => ({
          name: menu.name,
          oldMcSelections: this.allOldMcs.map(mc => ({
            mc: mc,
            selected: false
          })),
          newMcSelections: this.allNewMcs.map(mc => ({
            mc: mc,
            selected: menu.mcs.indexOf(mc) >= 0
          })),
          inheritOthersFrom: menu
        }))
      );
    }
  }

  addNewMenu() {
    this.reorganizedMenus.push({
      name: 'New Menu',
      oldMcSelections: this.allOldMcs.map(mc => ({
        mc: mc,
        selected: false
      })),
      newMcSelections: this.allNewMcs.map(mc => ({
        mc: mc,
        selected: false
      })),
    });
  }

  hasSelectedMcs(orgMenu) {
    return (orgMenu.oldMcSelections || []).some(mcSelection => mcSelection.selected) || (orgMenu.newMcSelections || []).some(mcSelection => mcSelection.selected);
  }
  getOrganizedMenus() {
    return this.reorganizedMenus
      .filter(m => (m.oldMcSelections || []).some(mcSelection => mcSelection.selected) || (m.newMcSelections || []).some(mcSelection => mcSelection.selected));
  }

  getOrganizedMenusAndMenuOptions() {
    const menus = this.getOrganizedMenus().map(m => {
      let newMenu: any = {};
      // inherit
      Object.assign(newMenu, m.inheritOthersFrom || {});
      newMenu.name = m.name;

      newMenu.mcs = [];
      [m.oldMcSelections, m.newMcSelections].map(mcSelections => mcSelections.map(
        mcSelection => {
          if (mcSelection.selected) {
            newMenu.mcs.push(mcSelection.mc);
          }
        }
      ));
      return newMenu;
    });

    // now let's get all relevant menuOptions
    const oldApplicableMenuOptions =
      this.restaurant1Clone.menuOptions
        .filter(mo => this.restaurant1Clone.menus.some(
          menu => menu.mcs.some(
            mc => menus.some(
              m => m.mcs.indexOf(mc) >= 0
                && ((mc.menuOptionIds || []).indexOf(mo.id) >= 0 || mc.mis.some(mi => (mi.menuOptionIds || []).indexOf(mo.id) >= 0))
            )))
        );

    // now let's get all relevant menuOptions
    const newApplicableMenuOptions =
      this.restaurant2Clone.menuOptions
        .filter(mo => this.restaurant2Clone.menus.some(
          menu => menu.mcs.some(
            mc => menus.some(
              m => m.mcs.indexOf(mc) >= 0
                && ((mc.menuOptionIds || []).indexOf(mo.id) >= 0 || mc.mis.some(mi => (mi.menuOptionIds || []).indexOf(mo.id) >= 0))
            )))
        );

    // remove dup mos
    const areMosSame = function (mo1, mo2) {
      if (
        // we ignore comparing id!!!
        mo1.name !== mo2.name ||
        mo1.minSelection !== mo2.minSelection ||
        mo1.maxSelection !== mo2.maxSelection ||
        mo1.items.length !== mo2.items.length
      ) {
        return false;
      }
      // whatever in mo1.items must be in mo2.items
      const set1 = new Set(mo1.items.map(item => JSON.stringify(item)));
      return !mo2.items.some(item => !set1.has(JSON.stringify(item)));
    };


    const allMos = [].concat(oldApplicableMenuOptions).concat(newApplicableMenuOptions);

    console.log('total mos before: ', allMos.length);
    
    for (let i = allMos.length - 1; i >= 0; i--) {
      for (let j = 0; j < i; j++) {
        if (areMosSame(allMos[i], allMos[j])) {
          menus.map(menu => menu.mcs.map(mc => {
            for (let m = 0; m < (mc.menuOptionIds || []).length; m++) {
              if (mc.menuOptionIds[m] === allMos[i].id) {
                mc.menuOptionIds[m] = allMos[j].id;
              }
            }
            mc.mis.map(mi => {
              for (let m = 0; m < (mi.menuOptionIds || []).length; m++) {
                if (mi.menuOptionIds[m] === allMos[i].id) {
                  mi.menuOptionIds[m] = allMos[j].id;
                }
              }
            });
          }));
          allMos.splice(i, 1);
          break;
        }
      }
    }

    console.log('total mos after: ', allMos.length);
    // re-assign menu ids
    menus.map((m, i) => {
      m.id = 'menu-' + i;
      m.mcs.map((mc, j) => {
        mc.id = m.id + '-mc-' + j;
        mc.mis.map((mi, k) => {
          mi.id = mc.id + '-mi-' + k;
          mi.category = mc.id;
        });
      });
    });

    return {
      menus: menus,
      menuOptions: allMos
    };
  }

  setAllSelection(selections, selected) {
    selections.map(selection => selection.selected = selected);
  }

  containsLunch(name) {
    return (name || '').toLowerCase().indexOf('lunch') >= 0;
  }

}
