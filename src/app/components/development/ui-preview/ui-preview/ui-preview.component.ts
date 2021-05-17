import { Component, OnInit } from '@angular/core';
// DO NOT DELETE THIS LINE. IT LET COMPILER KNOW THAT WE NEED ALL CLASSES (OTHER WISE AOT WILL NOT IMPORT)
import { SelectItem, Hour, Mi } from '@qmenu/ui';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-ui-preview',
  templateUrl: './ui-preview.component.html',
  styleUrls: ['./ui-preview.component.css']
})
export class UIPreviewComponent implements OnInit {

  d1 = new Date(0);
  d2 = new Date(3950000);
  constructor(private _http: HttpClient) {
    _http.get('https://api.coindesk.com/v1/bpi/currentprice.json').subscribe(p => console.log(p), error => console.log(error))
  }

  ngOnInit() {
    const mcs: any = [{ "mis": [{ "sizeOptions": { "0": { "price": 2 }, "1": { "price": 3.5 } }, "id": "1542438211451-0", "category": "1542438211451" }], "sortOrder": 21, "name": "Moo Shu", "id": "1542438211451", "images": [] }];

    const mi: any = { "sizeOptions": { "0": { "price": 2 }, "1": { "price": 3.5 } }, "id": "1542438211451-0", "category": "1542438211451" };

  }

  paymentMeans = {
    type: 'Direct Bank Deposit',
    direction: 'Receive',
    details: {
      routingNumber: 'xxxxxx',
      accountNumber: 'xxxxxx',
      name: 'Alex and Mary',
      address: 'some address....'
    }
  }

  restaurants = [
    {
      name: 'panda cafe',
      alias: 'panda-cafe',
      _id: '123',
      channels: [
        {
          value: '4075800000'
        }
      ]
    },
    {
      name: 'sichuan house',
      _id: '125',
      phones: [
        {
          phoneNumber: '6787990000'
        },
        {

          phoneNumber: '4042434223'
        }
      ],
      logo: 'https://s3.amazonaws.com/chopstresized/768_menuImage/1485327969129.png',
      googleAddress: {
        formatted_address: '112 villamoura way, GA, USA'
      }
    }
  ];

  switchValue = false;

  simpleRadioValue = 'Bob';
  simpleRadioChange(value) {
    console.log('triggered', value);
    console.log(this.simpleRadioValue);
  }

  newMi: Mi = {
    id: '123'
  } as Mi;

  mi: Mi = {
    "imageObjs": [
      {
        "originalUrl": "https://chopst.s3.amazonaws.com/menuImage/1492899600583.jpg",
        "thumbnailUrl": "https://s3.amazonaws.com/chopstresized/128_menuImage/1492899600583.jpg",
        "normalUrl": "https://s3.amazonaws.com/chopstresized/768_menuImage/1492899600583.jpg",
        "origin": "USER"
      }
    ],
    "sizeOptions": [
      {
        "name": "regular",
        "price": 2.78
      },
      {
        "name": "large",
        "price": 3.99
      }
    ],
    "name": "Vegetable Roll",
    "description": "Two pieces.",
    "id": "1-1-1",
    "number": "A1",
    "inventory": 0,
    "category": "1-1",
    "menuOptionIds": [
      "683e0c8d-2f75-4a15-a23b-8e61bd989a1e"
    ],
    "nonCustomizable": true,    
    "promotional": true,
    "disabled": false
  } as Mi;

  hours: Hour[] = [];

  hoursSubmit(event) {
    this.hours = event;
  }

  // for q-table-selector
  items: SelectItem[] = [
    { text: 'A', object: 1, selected: false },
    { text: 'Bbbbbbbbbbbbbbb', object: 2, selected: false },
    { text: 'C', object: 3, selected: false },
    { text: 'D', object: 4, selected: true },
    { text: 'E', object: 5, selected: false },
    { text: 'F', object: 6, selected: false },
    { text: 'G', object: 7, selected: false }

  ];

  myColumnDescriptors = [
    {
      label: ""
    },
    {
      label: "#"
    },
    {
      label: "First Name",
      paths: ['firstName'],
      sort: (a, b) => a > b ? 1 : (a < b ? -1 : 0),
      transform: (v) => v.toUpperCase()
    },
    {
      label: "City",
      paths: ['address', 'city']
    },
    {
      label: "Action"
    }
  ];
  myRows = [
    {
      firstName: "Gary",
      address: {
        city: "Duluth",
        zipcode: "30097"
      }
    },
    {
      firstName: "Chris",
      address: {
        city: "Atlanta",
        zipcode: "30022"
      }
    }
  ];

  rowClick(row) {
    alert(row.firstName);
  }

  mySampleAddress: any = {
    place_id: '12345',
    formatted_address: '114 Villamoura Way, Duluth, GA USA'
  }


  rating = 3;
  toggle = true;
  buttonLoading = false;
  varMask;
  varDebounce;
  debouncedValue;
  varPhone;
  collapseFlag;

  rowData = [];
  headers = [];
  dropdownSelectedItem;

  selectItems = [
    { text: '8"' },
    { text: '12"', secondaryText: "editor choice" },
    { text: '16"', secondaryText: "editor choice" }
  ];

  formObject = {
    manager: 4,
    roles: ["ADMIN"],
    address: {
      city: "Johns Creek",
      state: "GA"
    }
    // agree: true
  };
  formFieldDescriptors = [
    {
      field: "address.city",
      label: "City"
      // disabled: true
    },
    {
      field: "username",
      label: "User Name",
      autocomplete: "off"
    },
    {
      field: "password",
      label: "Password",
      inputType: "password"
      // disabled: true
    },
    {
      field: "manager",
      label: "Manager",
      inputType: "single-select",
      // disabled: true,
      items: [
        {
          object: 3,
          text: "Zhang3"
        },
        {
          object: 4,
          text: "Li4"
        },
        {
          object: 5,
          text: "Wang5"
        }
      ]
    },
    {
      field: "roles",
      label: "Roles",
      inputType: "multi-select",
      minSelection: 1,
      maxSelection: 2,
      // disabled: true,
      items: [
        {
          object: "ADMIN",
          text: "Admin"
        },
        {
          object: "EDITOR",
          text: "Editor"
        },
        {
          object: "AUDITOR",
          text: "Auditor"
        }
      ]
    },
    {
      field: "agree",
      label: "Agree to the terms.",
      inputType: "checkbox"
      // disabled: true
    },
    {
      field: "comments",
      label: "Comments",
      inputType: "textarea",
      // disabled: true
    },
  ];

  formSubmit(event) {
    // simulate API request...
    setTimeout(
      () =>
        event.acknowledge(
          new Date().valueOf() % 2 === 0 ? null : "Simulated error occured."
        ),
      1000
    );
  }
  formRemove(event) {
    // simulate API request...
    setTimeout(
      () =>
        event.acknowledge(
          new Date().valueOf() % 2 === 0 ? null : "Simulated error occured."
        ),
      1000
    );
  }

  select(event) {
  }

  ratingChanged(event) {
  }

  toggleChanged(event) {
    console.log(event)
  }

  clickLoading() {
    this.buttonLoading = true;
    setTimeout(() => {
      this.buttonLoading = false;
    }, 1000);
  }
  pageChanged(pageNumber) {
  }
  onDebounce(value) {
    this.debouncedValue = value;
  }

  submitEditLabel(value) {
  }

  mockRestaurant = {
    _id: {
      $oid: "5ab68823734d1d57bac4ada3"
    },
    alias: "rays-pizza",
    name: "Ray's Pizza",
    menuOptions: [
      {
        minSelection: 0,
        maxSelection: -1,
        items: [
          {
            name: "Anchovies",
            price: 0.88,
            placement: "Left",
            forSize: "Medium"
          },
          {
            name: "Anchovies",
            price: 0.88,
            placement: "Right",
            forSize: "Medium"
          },
          {
            name: "Anchovies",
            price: 1.75,
            placement: "Whole",
            forSize: "Medium"
          },
          {
            name: "Black Olives",
            price: 0.88,
            placement: "Left",
            forSize: "Medium"
          },
          {
            name: "Black Olives",
            price: 0.88,
            placement: "Right",
            forSize: "Medium"
          },
          {
            name: "Black Olives",
            price: 1.75,
            placement: "Whole",
            forSize: "Medium"
          },
          {
            name: "Extra Cheese",
            price: 0.88,
            placement: "Left",
            forSize: "Medium"
          },
          {
            name: "Extra Cheese",
            price: 0.88,
            placement: "Right",
            forSize: "Medium"
          },
          {
            name: "Extra Cheese",
            price: 1.75,
            placement: "Whole",
            forSize: "Medium"
          },
          {
            name: "Fresh Garlic",
            price: 0.88,
            placement: "Left",
            forSize: "Medium"
          },
          {
            name: "Fresh Garlic",
            price: 0.88,
            placement: "Right",
            forSize: "Medium"
          },
          {
            name: "Fresh Garlic",
            price: 1.75,
            placement: "Whole",
            forSize: "Medium"
          },
          {
            name: "Fresh Tomatoes",
            price: 0.88,
            placement: "Left",
            forSize: "Medium"
          },
          {
            name: "Fresh Tomatoes",
            price: 0.88,
            placement: "Right",
            forSize: "Medium"
          },
          {
            name: "Fresh Tomatoes",
            price: 1.75,
            placement: "Whole",
            forSize: "Medium"
          },
          {
            name: "Green Peppers",
            price: 0.88,
            placement: "Left",
            forSize: "Medium"
          },
          {
            name: "Green Peppers",
            price: 0.88,
            placement: "Right",
            forSize: "Medium"
          },
          {
            name: "Green Peppers",
            price: 1.75,
            placement: "Whole",
            forSize: "Medium"
          },
          {
            name: "Ham",
            price: 0.88,
            placement: "Left",
            forSize: "Medium"
          },
          {
            name: "Ham",
            price: 0.88,
            placement: "Right",
            forSize: "Medium"
          },
          {
            name: "Ham",
            price: 1.75,
            placement: "Whole",
            forSize: "Medium"
          },
          {
            name: "Jalapenos",
            price: 0.88,
            placement: "Left",
            forSize: "Medium"
          },
          {
            name: "Jalapenos",
            price: 0.88,
            placement: "Right",
            forSize: "Medium"
          },
          {
            name: "Jalapenos",
            price: 1.75,
            placement: "Whole",
            forSize: "Medium"
          },
          {
            name: "Meatballs",
            price: 0.88,
            placement: "Left",
            forSize: "Medium"
          },
          {
            name: "Meatballs",
            price: 0.88,
            placement: "Right",
            forSize: "Medium"
          },
          {
            name: "Meatballs",
            price: 1.75,
            placement: "Whole",
            forSize: "Medium"
          },
          {
            name: "Mushrooms",
            price: 0.88,
            placement: "Left",
            forSize: "Medium"
          },
          {
            name: "Mushrooms",
            price: 0.88,
            placement: "Right",
            forSize: "Medium"
          },
          {
            name: "Mushrooms",
            price: 1.75,
            placement: "Whole",
            forSize: "Medium"
          },
          {
            name: "Onions",
            price: 0.88,
            placement: "Left",
            forSize: "Medium"
          },
          {
            name: "Onions",
            price: 0.88,
            placement: "Right",
            forSize: "Medium"
          },
          {
            name: "Onions",
            price: 1.75,
            placement: "Whole",
            forSize: "Medium"
          },
          {
            name: "Pepperoni",
            price: 0.88,
            placement: "Left",
            forSize: "Medium"
          },
          {
            name: "Pepperoni",
            price: 0.88,
            placement: "Right",
            forSize: "Medium"
          },
          {
            name: "Pepperoni",
            price: 1.75,
            placement: "Whole",
            forSize: "Medium"
          },
          {
            name: "Pesto",
            price: 0.88,
            placement: "Left",
            forSize: "Medium"
          },
          {
            name: "Pesto",
            price: 0.88,
            placement: "Right",
            forSize: "Medium"
          },
          {
            name: "Pesto",
            price: 1.75,
            placement: "Whole",
            forSize: "Medium"
          },
          {
            name: "Pineapple",
            price: 0.88,
            placement: "Left",
            forSize: "Medium"
          },
          {
            name: "Pineapple",
            price: 0.88,
            placement: "Right",
            forSize: "Medium"
          },
          {
            name: "Pineapple",
            price: 1.75,
            placement: "Whole",
            forSize: "Medium"
          },
          {
            name: "Sausage",
            price: 0.88,
            placement: "Left",
            forSize: "Medium"
          },
          {
            name: "Sausage",
            price: 0.88,
            placement: "Right",
            forSize: "Medium"
          },
          {
            name: "Sausage",
            price: 1.75,
            placement: "Whole",
            forSize: "Medium"
          },
          {
            name: "Spinach",
            price: 0.88,
            placement: "Left",
            forSize: "Medium"
          },
          {
            name: "Spinach",
            price: 0.88,
            placement: "Right",
            forSize: "Medium"
          },
          {
            name: "Spinach",
            price: 1.75,
            placement: "Whole",
            forSize: "Medium"
          },
          {
            name: "Anchovies",
            price: 1,
            placement: "Left",
            forSize: "Large"
          },
          {
            name: "Anchovies",
            price: 1,
            placement: "Right",
            forSize: "Large"
          },
          {
            name: "Anchovies",
            price: 2,
            placement: "Whole",
            forSize: "Large"
          },
          {
            name: "Black Olives",
            price: 1,
            placement: "Left",
            forSize: "Large"
          },
          {
            name: "Black Olives",
            price: 1,
            placement: "Right",
            forSize: "Large"
          },
          {
            name: "Black Olives",
            price: 2,
            placement: "Whole",
            forSize: "Large"
          },
          {
            name: "Extra Cheese",
            price: 1,
            placement: "Left",
            forSize: "Large"
          },
          {
            name: "Extra Cheese",
            price: 1,
            placement: "Right",
            forSize: "Large"
          },
          {
            name: "Extra Cheese",
            price: 2,
            placement: "Whole",
            forSize: "Large"
          },
          {
            name: "Fresh Garlic",
            price: 1,
            placement: "Left",
            forSize: "Large"
          },
          {
            name: "Fresh Garlic",
            price: 1,
            placement: "Right",
            forSize: "Large"
          },
          {
            name: "Fresh Garlic",
            price: 2,
            placement: "Whole",
            forSize: "Large"
          },
          {
            name: "Fresh Tomatoes",
            price: 1,
            placement: "Left",
            forSize: "Large"
          },
          {
            name: "Fresh Tomatoes",
            price: 1,
            placement: "Right",
            forSize: "Large"
          },
          {
            name: "Fresh Tomatoes",
            price: 2,
            placement: "Whole",
            forSize: "Large"
          },
          {
            name: "Green Peppers",
            price: 1,
            placement: "Left",
            forSize: "Large"
          },
          {
            name: "Green Peppers",
            price: 1,
            placement: "Right",
            forSize: "Large"
          },
          {
            name: "Green Peppers",
            price: 2,
            placement: "Whole",
            forSize: "Large"
          },
          {
            name: "Ham",
            price: 1,
            placement: "Left",
            forSize: "Large"
          },
          {
            name: "Ham",
            price: 1,
            placement: "Right",
            forSize: "Large"
          },
          {
            name: "Ham",
            price: 2,
            placement: "Whole",
            forSize: "Large"
          },
          {
            name: "Jalapenos",
            price: 1,
            placement: "Left",
            forSize: "Large"
          },
          {
            name: "Jalapenos",
            price: 1,
            placement: "Right",
            forSize: "Large"
          },
          {
            name: "Jalapenos",
            price: 2,
            placement: "Whole",
            forSize: "Large"
          },
          {
            name: "Meatballs",
            price: 1,
            placement: "Left",
            forSize: "Large"
          },
          {
            name: "Meatballs",
            price: 1,
            placement: "Right",
            forSize: "Large"
          },
          {
            name: "Meatballs",
            price: 2,
            placement: "Whole",
            forSize: "Large"
          },
          {
            name: "Mushrooms",
            price: 1,
            placement: "Left",
            forSize: "Large"
          },
          {
            name: "Mushrooms",
            price: 1,
            placement: "Right",
            forSize: "Large"
          },
          {
            name: "Mushrooms",
            price: 2,
            placement: "Whole",
            forSize: "Large"
          },
          {
            name: "Onions",
            price: 1,
            placement: "Left",
            forSize: "Large"
          },
          {
            name: "Onions",
            price: 1,
            placement: "Right",
            forSize: "Large"
          },
          {
            name: "Onions",
            price: 2,
            placement: "Whole",
            forSize: "Large"
          },
          {
            name: "Pepperoni",
            price: 1,
            placement: "Left",
            forSize: "Large"
          },
          {
            name: "Pepperoni",
            price: 1,
            placement: "Right",
            forSize: "Large"
          },
          {
            name: "Pepperoni",
            price: 2,
            placement: "Whole",
            forSize: "Large"
          },
          {
            name: "Pesto",
            price: 1,
            placement: "Left",
            forSize: "Large"
          },
          {
            name: "Pesto",
            price: 1,
            placement: "Right",
            forSize: "Large"
          },
          {
            name: "Pesto",
            price: 2,
            placement: "Whole",
            forSize: "Large"
          },
          {
            name: "Pineapple",
            price: 1,
            placement: "Left",
            forSize: "Large"
          },
          {
            name: "Pineapple",
            price: 1,
            placement: "Right",
            forSize: "Large"
          },
          {
            name: "Pineapple",
            price: 2,
            placement: "Whole",
            forSize: "Large"
          },
          {
            name: "Sausage",
            price: 1,
            placement: "Left",
            forSize: "Large"
          },
          {
            name: "Sausage",
            price: 1,
            placement: "Right",
            forSize: "Large"
          },
          {
            name: "Sausage",
            price: 2,
            placement: "Whole",
            forSize: "Large"
          },
          {
            name: "Spinach",
            price: 1,
            placement: "Left",
            forSize: "Large"
          },
          {
            name: "Spinach",
            price: 1,
            placement: "Right",
            forSize: "Large"
          },
          {
            name: "Spinach",
            price: 2,
            placement: "Whole",
            forSize: "Large"
          }
        ],
        name: "Toppings",
        id: "0"
      },
      {
        name: "Add Toppings",
        minSelection: 0,
        maxSelection: -1,
        items: [
          {
            name: "Anchovies",
            price: 0.6
          },
          {
            name: "Meatballs",
            price: 0.6
          },
          {
            name: "Pineapple",
            price: 0.6
          },
          {
            name: "Black Olives",
            price: 0.6
          },
          {
            name: "Mushrooms",
            price: 0.6
          },
          {
            name: "Sausage",
            price: 0.6
          },
          {
            name: "Extra Cheese",
            price: 0.6
          },
          {
            name: "Onions",
            price: 0.6
          },
          {
            name: "Tomatoes",
            price: 0.6
          },
          {
            name: "Green Peppers",
            price: 0.6
          },
          {
            name: "Pepperoni",
            price: 0.6
          },
          {
            name: "Ham",
            price: 0.6
          }
        ],
        id: "1"
      },
      {
        name: "Choose Soda",
        minSelection: 1,
        maxSelection: 1,
        items: [
          {
            name: "Pepsi",
            price: 0,
            selected: true
          },
          {
            name: "Diet Pepsi",
            price: 0
          },
          {
            name: "Mountain Dew",
            price: 0
          }
        ],
        id: "2"
      },
      {
        name: "Add Toppings for the First Pizza Slice",
        minSelection: 0,
        maxSelection: -1,
        items: [
          {
            name: "Anchovies",
            price: 0.6
          },
          {
            name: "Meatballs",
            price: 0.6
          },
          {
            name: "Pineapple",
            price: 0.6
          },
          {
            name: "Black Olives",
            price: 0.6
          },
          {
            name: "Mushrooms",
            price: 0.6
          },
          {
            name: "Sausage",
            price: 0.6
          },
          {
            name: "Extra Cheese",
            price: 0.6
          },
          {
            name: "Onions",
            price: 0.6
          },
          {
            name: "Tomatoes",
            price: 0.6
          },
          {
            name: "Green Peppers",
            price: 0.6
          },
          {
            name: "Pepperoni",
            price: 0.6
          },
          {
            name: "Ham",
            price: 0.6
          }
        ],
        id: "3"
      },
      {
        name: "Add Toppings for the Second Pizza Slice",
        minSelection: 0,
        maxSelection: -1,
        items: [
          {
            name: "Anchovies",
            price: 0.6
          },
          {
            name: "Meatballs",
            price: 0.6
          },
          {
            name: "Pineapple",
            price: 0.6
          },
          {
            name: "Black Olives",
            price: 0.6
          },
          {
            name: "Mushrooms",
            price: 0.6
          },
          {
            name: "Sausage",
            price: 0.6
          },
          {
            name: "Extra Cheese",
            price: 0.6
          },
          {
            name: "Onions",
            price: 0.6
          },
          {
            name: "Tomatoes",
            price: 0.6
          },
          {
            name: "Green Peppers",
            price: 0.6
          },
          {
            name: "Pepperoni",
            price: 0.6
          },
          {
            name: "Ham",
            price: 0.6
          }
        ],
        id: "4"
      },
      {
        name: "Choose Wings Option",
        minSelection: 1,
        maxSelection: 1,
        items: [
          {
            name: "Plain",
            price: 0,
            selected: true
          },
          {
            name: "Medium Sauce",
            price: 0
          },
          {
            name: "Mild Sauce",
            price: 0
          },
          {
            name: "Hot Sauce",
            price: 0
          },
          {
            name: "BBQ Sauce",
            price: 0
          }
        ],
        id: "5"
      },
      {
        name: "Choose Salad Dressing",
        minSelection: 0,
        maxSelection: 1,
        items: [
          {
            name: "Italian Dressing",
            price: 0
          },
          {
            name: "Ranch Dressing",
            price: 0
          },
          {
            name: "Oil & Vinegar Dressing",
            price: 0
          },
          {
            name: "Bleu Cheese Dressing",
            price: 0
          },
          {
            name: "No Dressing",
            price: 0
          }
        ],
        id: "6"
      },
      {
        name: "Add Toppings for the First Pizza",
        minSelection: 0,
        maxSelection: -1,
        items: [
          {
            name: "Anchovies",
            price: 2
          },
          {
            name: "Black Olives",
            price: 2
          },
          {
            name: "Extra Cheese",
            price: 2
          },
          {
            name: "Fresh Garlic",
            price: 2
          },
          {
            name: "Fresh Tomatoes",
            price: 2
          },
          {
            name: "Green Peppers",
            price: 2
          },
          {
            name: "Ham",
            price: 2
          },
          {
            name: "Jalapenos",
            price: 2
          },
          {
            name: "Meatballs",
            price: 2
          },
          {
            name: "Mushrooms",
            price: 2
          },
          {
            name: "Onions",
            price: 2
          },
          {
            name: "Pepperoni",
            price: 2
          },
          {
            name: "Pesto",
            price: 2
          },
          {
            name: "Pineapple",
            price: 2
          },
          {
            name: "Sausage",
            price: 2
          },
          {
            name: "Spinach",
            price: 2
          }
        ],
        id: "7"
      },
      {
        name: "Add Toppings for the Second Pizza",
        minSelection: 0,
        maxSelection: -1,
        items: [
          {
            name: "Anchovies",
            price: 2
          },
          {
            name: "Black Olives",
            price: 2
          },
          {
            name: "Extra Cheese",
            price: 2
          },
          {
            name: "Fresh Garlic",
            price: 2
          },
          {
            name: "Fresh Tomatoes",
            price: 2
          },
          {
            name: "Green Peppers",
            price: 2
          },
          {
            name: "Ham",
            price: 2
          },
          {
            name: "Jalapenos",
            price: 2
          },
          {
            name: "Meatballs",
            price: 2
          },
          {
            name: "Mushrooms",
            price: 2
          },
          {
            name: "Onions",
            price: 2
          },
          {
            name: "Pepperoni",
            price: 2
          },
          {
            name: "Pesto",
            price: 2
          },
          {
            name: "Pineapple",
            price: 2
          },
          {
            name: "Sausage",
            price: 2
          },
          {
            name: "Spinach",
            price: 2
          }
        ],
        id: "8"
      },
      {
        name: "Add Toppings",
        minSelection: 0,
        maxSelection: -1,
        items: [
          {
            name: "Anchovies",
            price: 0.75,
            forSize: "10''"
          },
          {
            name: "Black Olives",
            price: 0.75,
            forSize: "10''"
          },
          {
            name: "Extra Cheese",
            price: 0.75,
            forSize: "10''"
          },
          {
            name: "Fresh Garlic",
            price: 0.75,
            forSize: "10''"
          },
          {
            name: "Fresh Tomatoes",
            price: 0.75,
            forSize: "10''"
          },
          {
            name: "Green Peppers",
            price: 0.75,
            forSize: "10''"
          },
          {
            name: "Ham",
            price: 0.75,
            forSize: "10''"
          },
          {
            name: "Jalapenos",
            price: 0.75,
            forSize: "10''"
          },
          {
            name: "Meatballs",
            price: 0.75,
            forSize: "10''"
          },
          {
            name: "Mushrooms",
            price: 0.75,
            forSize: "10''"
          },
          {
            name: "Onions",
            price: 0.75,
            forSize: "10''"
          },
          {
            name: "Pepperoni",
            price: 0.75,
            forSize: "10''"
          },
          {
            name: "Pesto",
            price: 0.75,
            forSize: "10''"
          },
          {
            name: "Pineapple",
            price: 0.75,
            forSize: "10''"
          },
          {
            name: "Sausage",
            price: 0.75,
            forSize: "10''"
          },
          {
            name: "Spinach",
            price: 0.75,
            forSize: "10''"
          }
        ],
        id: "9"
      },
      {
        minSelection: 0,
        maxSelection: -1,
        items: [
          {
            name: "Anchovies",
            price: 0.88,
            placement: "Left",
            forSize: "14''"
          },
          {
            name: "Anchovies",
            price: 0.88,
            placement: "Right",
            forSize: "14''"
          },
          {
            name: "Anchovies",
            price: 1.75,
            placement: "Whole",
            forSize: "14''"
          },
          {
            name: "Black Olives",
            price: 0.88,
            placement: "Left",
            forSize: "14''"
          },
          {
            name: "Black Olives",
            price: 0.88,
            placement: "Right",
            forSize: "14''"
          },
          {
            name: "Black Olives",
            price: 1.75,
            placement: "Whole",
            forSize: "14''"
          },
          {
            name: "Extra Cheese",
            price: 0.88,
            placement: "Left",
            forSize: "14''"
          },
          {
            name: "Extra Cheese",
            price: 0.88,
            placement: "Right",
            forSize: "14''"
          },
          {
            name: "Extra Cheese",
            price: 1.75,
            placement: "Whole",
            forSize: "14''"
          },
          {
            name: "Fresh Garlic",
            price: 0.88,
            placement: "Left",
            forSize: "14''"
          },
          {
            name: "Fresh Garlic",
            price: 0.88,
            placement: "Right",
            forSize: "14''"
          },
          {
            name: "Fresh Garlic",
            price: 1.75,
            placement: "Whole",
            forSize: "14''"
          },
          {
            name: "Fresh Tomatoes",
            price: 0.88,
            placement: "Left",
            forSize: "14''"
          },
          {
            name: "Fresh Tomatoes",
            price: 0.88,
            placement: "Right",
            forSize: "14''"
          },
          {
            name: "Fresh Tomatoes",
            price: 1.75,
            placement: "Whole",
            forSize: "14''"
          },
          {
            name: "Green Peppers",
            price: 0.88,
            placement: "Left",
            forSize: "14''"
          },
          {
            name: "Green Peppers",
            price: 0.88,
            placement: "Right",
            forSize: "14''"
          },
          {
            name: "Green Peppers",
            price: 1.75,
            placement: "Whole",
            forSize: "14''"
          },
          {
            name: "Ham",
            price: 0.88,
            placement: "Left",
            forSize: "14''"
          },
          {
            name: "Ham",
            price: 0.88,
            placement: "Right",
            forSize: "14''"
          },
          {
            name: "Ham",
            price: 1.75,
            placement: "Whole",
            forSize: "14''"
          },
          {
            name: "Jalapenos",
            price: 0.88,
            placement: "Left",
            forSize: "14''"
          },
          {
            name: "Jalapenos",
            price: 0.88,
            placement: "Right",
            forSize: "14''"
          },
          {
            name: "Jalapenos",
            price: 1.75,
            placement: "Whole",
            forSize: "14''"
          },
          {
            name: "Meatballs",
            price: 0.88,
            placement: "Left",
            forSize: "14''"
          },
          {
            name: "Meatballs",
            price: 0.88,
            placement: "Right",
            forSize: "14''"
          },
          {
            name: "Meatballs",
            price: 1.75,
            placement: "Whole",
            forSize: "14''"
          },
          {
            name: "Mushrooms",
            price: 0.88,
            placement: "Left",
            forSize: "14''"
          },
          {
            name: "Mushrooms",
            price: 0.88,
            placement: "Right",
            forSize: "14''"
          },
          {
            name: "Mushrooms",
            price: 1.75,
            placement: "Whole",
            forSize: "14''"
          },
          {
            name: "Onions",
            price: 0.88,
            placement: "Left",
            forSize: "14''"
          },
          {
            name: "Onions",
            price: 0.88,
            placement: "Right",
            forSize: "14''"
          },
          {
            name: "Onions",
            price: 1.75,
            placement: "Whole",
            forSize: "14''"
          },
          {
            name: "Pepperoni",
            price: 0.88,
            placement: "Left",
            forSize: "14''"
          },
          {
            name: "Pepperoni",
            price: 0.88,
            placement: "Right",
            forSize: "14''"
          },
          {
            name: "Pepperoni",
            price: 1.75,
            placement: "Whole",
            forSize: "14''"
          },
          {
            name: "Pesto",
            price: 0.88,
            placement: "Left",
            forSize: "14''"
          },
          {
            name: "Pesto",
            price: 0.88,
            placement: "Right",
            forSize: "14''"
          },
          {
            name: "Pesto",
            price: 1.75,
            placement: "Whole",
            forSize: "14''"
          },
          {
            name: "Pineapple",
            price: 0.88,
            placement: "Left",
            forSize: "14''"
          },
          {
            name: "Pineapple",
            price: 0.88,
            placement: "Right",
            forSize: "14''"
          },
          {
            name: "Pineapple",
            price: 1.75,
            placement: "Whole",
            forSize: "14''"
          },
          {
            name: "Sausage",
            price: 0.88,
            placement: "Left",
            forSize: "14''"
          },
          {
            name: "Sausage",
            price: 0.88,
            placement: "Right",
            forSize: "14''"
          },
          {
            name: "Sausage",
            price: 1.75,
            placement: "Whole",
            forSize: "14''"
          },
          {
            name: "Spinach",
            price: 0.88,
            placement: "Left",
            forSize: "14''"
          },
          {
            name: "Spinach",
            price: 0.88,
            placement: "Right",
            forSize: "14''"
          },
          {
            name: "Spinach",
            price: 1.75,
            placement: "Whole",
            forSize: "14''"
          }
        ],
        name: "Toppings",
        id: "10"
      },
      {
        name: "Add Toppings",
        minSelection: 0,
        maxSelection: -1,
        items: [
          {
            name: "Anchovies",
            price: 2
          },
          {
            name: "Black Olives",
            price: 2
          },
          {
            name: "Extra Cheese",
            price: 2
          },
          {
            name: "Fresh Garlic",
            price: 2
          },
          {
            name: "Fresh Tomatoes",
            price: 2
          },
          {
            name: "Green Peppers",
            price: 2
          },
          {
            name: "Ham",
            price: 2
          },
          {
            name: "Jalapenos",
            price: 2
          },
          {
            name: "Meatballs",
            price: 2
          },
          {
            name: "Mushrooms",
            price: 2
          },
          {
            name: "Onions",
            price: 2
          },
          {
            name: "Pepperoni",
            price: 2
          },
          {
            name: "Pesto",
            price: 2
          },
          {
            name: "Pineapple",
            price: 2
          },
          {
            name: "Sausage",
            price: 2
          },
          {
            name: "Spinach",
            price: 2
          }
        ],
        id: "11"
      },
      {
        name: "Choose Dressing",
        minSelection: 0,
        maxSelection: 1,
        items: [
          {
            name: "Italian Dressing",
            price: 0
          },
          {
            name: "Ranch Dressing",
            price: 0
          },
          {
            name: "Oil & Vinegar Dressing",
            price: 0
          },
          {
            name: "Bleu Cheese Dressing",
            price: 0
          },
          {
            name: "No Dressing",
            price: 0
          }
        ],
        id: "12"
      },
      {
        name: "Add Extra",
        minSelection: 0,
        maxSelection: -1,
        items: [
          {
            name: "Extra Dressing",
            price: 0.25
          }
        ],
        id: "13"
      },
      {
        name: "Choose Option",
        minSelection: 1,
        maxSelection: 1,
        items: [
          {
            name: "Plain",
            price: 0,
            selected: true
          },
          {
            name: "Medium Sauce",
            price: 0
          },
          {
            name: "Mild Sauce",
            price: 0
          },
          {
            name: "Hot Sauce",
            price: 0
          },
          {
            name: "BBQ Sauce",
            price: 0
          }
        ],
        id: "14"
      },
      {
        name: "Add Extra",
        minSelection: 0,
        maxSelection: -1,
        items: [
          {
            name: "Extra Dipping Sauce",
            price: 0.25
          }
        ],
        id: "15"
      },
      {
        name: "Add Extra",
        minSelection: 0,
        maxSelection: -1,
        items: [
          {
            name: "Extra Tomato Sauce on Side",
            price: 0.5
          }
        ],
        id: "16"
      },
      {
        name: "Add Toppings",
        minSelection: 0,
        maxSelection: -1,
        items: [
          {
            name: "Lettuce",
            price: 0
          },
          {
            name: "Oil & Vinegar",
            price: 0
          },
          {
            name: "Onions",
            price: 0
          },
          {
            name: "Salt & Peppers",
            price: 0
          },
          {
            name: "Side of Mayo",
            price: 0
          },
          {
            name: "Tomatoes",
            price: 0
          },
          {
            name: "Cheese",
            price: 0.75
          }
        ],
        id: "17"
      },
      {
        name: "Choose Option",
        minSelection: 1,
        maxSelection: 1,
        items: [
          {
            name: "Hot",
            price: 0,
            selected: true
          },
          {
            name: "Cold",
            price: 0
          }
        ],
        id: "18"
      },
      {
        name: "Add Extra",
        minSelection: 0,
        maxSelection: -1,
        items: [
          {
            name: "Extra Cheese",
            price: 0.75
          }
        ],
        id: "19"
      },
      {
        name: "Add Extra",
        minSelection: 0,
        maxSelection: -1,
        items: [
          {
            name: "Garlic Bread",
            price: 2.25
          },
          {
            name: "Garlic Cheese Bread",
            price: 3
          }
        ],
        id: "20"
      }
    ],
    menus: [
      {
        name: "MENU",
        mcs: [
          {
            name: "Pizza",
            mis: [
              {
                name: "Neapolitan Cheese Pizza",
                description:
                  "With homemade dough. Classic cheese or create your own pizza.",
                sizeOptions: [
                  {
                    name: "Medium",
                    price: 13.45,
                    selected: true
                  },
                  {
                    name: "Large",
                    price: 15.95
                  }
                ],
                menuOptionIds: [],
                category: "0-0",
                id: "0-0-0",
                sortOrder: "0"
              },
              {
                name: "Neapolitan Meat Lover's Pizza",
                description: "Meatballs, sausage, ham, pepperoni, cheese.",
                sizeOptions: [
                  {
                    name: "Medium",
                    price: 20.45,
                    selected: true
                  },
                  {
                    name: "Large",
                    price: 23.95
                  }
                ],
                menuOptionIds: [],
                category: "0-0",
                id: "0-0-1",
                sortOrder: "1"
              },
              {
                name: "Neapolitan Monster Pizza",
                description:
                  "Sausage, pepperoni, mushrooms, green peppers, onions, and cheese.",
                sizeOptions: [
                  {
                    name: "Medium",
                    price: 20.45,
                    selected: true
                  },
                  {
                    name: "Large",
                    price: 23.95
                  }
                ],
                menuOptionIds: [],
                category: "0-0",
                id: "0-0-2",
                sortOrder: "2"
              },
              {
                name: "Neapolitan Pesto Pizza",
                description:
                  "Sausage, pepperoni, mushrooms, green peppers, onions, and cheese.",
                sizeOptions: [
                  {
                    name: "Medium",
                    price: 15.2,
                    selected: true
                  },
                  {
                    name: "Large",
                    price: 17.95
                  }
                ],
                menuOptionIds: [],
                category: "0-0",
                id: "0-0-3",
                sortOrder: "3"
              },
              {
                name: "Neapolitan Spinach Tomato Pizza",
                description: null,
                sizeOptions: [
                  {
                    name: "Medium",
                    price: 16.95,
                    selected: true
                  },
                  {
                    name: "Large",
                    price: 19.95
                  }
                ],
                menuOptionIds: [],
                category: "0-0",
                id: "0-0-4",
                sortOrder: "4"
              },
              {
                name: "Neapolitan Veggie Pizza",
                description:
                  "Mushrooms, black olive, green peppers, onions, and cheese.",
                sizeOptions: [
                  {
                    name: "Medium",
                    price: 20.45,
                    selected: true
                  },
                  {
                    name: "Large",
                    price: 23.95
                  }
                ],
                menuOptionIds: [],
                category: "0-0",
                id: "0-0-5",
                sortOrder: "5"
              },
              {
                name: "Neapolitan White Pizza",
                description: "Ricotta, mozzarella, & parmesan cheeses.",
                sizeOptions: [
                  {
                    name: "Medium",
                    price: 15.2,
                    selected: true
                  },
                  {
                    name: "Large",
                    price: 17.95
                  }
                ],
                menuOptionIds: [],
                category: "0-0",
                id: "0-0-6",
                sortOrder: "6"
              },
              {
                name: "Neapolitan Chicken Alfredo Pizza",
                description: "Alfredo sauce diced chicken, cheese.",
                sizeOptions: [
                  {
                    name: "Medium",
                    price: 16.95,
                    selected: true
                  },
                  {
                    name: "Large",
                    price: 19.95
                  }
                ],
                menuOptionIds: [],
                category: "0-0",
                id: "0-0-7",
                sortOrder: "7"
              },
              {
                name: "Neapolitan Hawaiian Pizza",
                description: "Ham, pineapple, cheese.",
                sizeOptions: [
                  {
                    name: "Medium",
                    price: 16.95,
                    selected: true
                  },
                  {
                    name: "Large",
                    price: 19.95
                  }
                ],
                menuOptionIds: [],
                category: "0-0",
                id: "0-0-8",
                sortOrder: "8"
              },
              {
                name: "Neapolitan Margherita Pizza",
                description: null,
                sizeOptions: [
                  {
                    name: "Medium",
                    price: 16.95,
                    selected: true
                  },
                  {
                    name: "Large",
                    price: 19.95
                  }
                ],
                menuOptionIds: [],
                category: "0-0",
                id: "0-0-9",
                sortOrder: "9"
              }
            ],
            id: "0-0",
            sortOrder: "0",
            menuOptionIds: ["0"]
          },
          {
            name: "Sicilian Pizza",
            mis: [
              {
                name: "Sicilian Thick Crust Cheese Pizza",
                description: "Classic cheese or create your own pizza.",
                sizeOptions: [
                  {
                    name: "Medium",
                    price: 15.95,
                    selected: true
                  },
                  {
                    name: "Large",
                    price: 19.95
                  }
                ],
                menuOptionIds: [],
                category: "0-1",
                id: "0-1-0",
                sortOrder: "0"
              },
              {
                name: "Sicilian Thick Crust Monster Pizza",
                description:
                  "Sausage, pepperoni, mushrooms, green peppers, onions, cheese.",
                sizeOptions: [
                  {
                    name: "Medium",
                    price: 18.25,
                    selected: true
                  },
                  {
                    name: "Large",
                    price: 26.95
                  }
                ],
                menuOptionIds: [],
                category: "0-1",
                id: "0-1-1",
                sortOrder: "1"
              },
              {
                name: "Sicilian Thick Crust Chicken Pizza",
                description: null,
                sizeOptions: [
                  {
                    name: "Medium",
                    price: 17.45,
                    selected: true
                  },
                  {
                    name: "Large",
                    price: 21.7
                  }
                ],
                menuOptionIds: [],
                category: "0-1",
                id: "0-1-2",
                sortOrder: "2"
              },
              {
                name: "Sicilian Thick Crust Meat Lover's Pizza",
                description: null,
                sizeOptions: [
                  {
                    name: "Medium",
                    price: 18.25,
                    selected: true
                  },
                  {
                    name: "Large",
                    price: 26.95
                  }
                ],
                menuOptionIds: [],
                category: "0-1",
                id: "0-1-3",
                sortOrder: "3"
              },
              {
                name: "Sicilian Thick Crust Veggie Pizza",
                description:
                  "Mushroom, black olives, green peppers, onions, cheese.",
                sizeOptions: [
                  {
                    name: "Medium",
                    price: 18.25,
                    selected: true
                  },
                  {
                    name: "Large",
                    price: 26.95
                  }
                ],
                menuOptionIds: [],
                category: "0-1",
                id: "0-1-4",
                sortOrder: "4"
              }
            ],
            id: "0-1",
            sortOrder: "1",
            menuOptionIds: ["0"]
          },
          {
            name: "Pizza By The Slice",
            mis: [
              {
                name: "Cheese Pizza Slice",
                description: null,
                sizeOptions: [
                  {
                    name: "Slice",
                    price: 2.5,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-2",
                id: "0-2-0",
                sortOrder: "0"
              },
              {
                name: "Chicken Alfredo Pizza Slice",
                description: null,
                sizeOptions: [
                  {
                    name: "Slice",
                    price: 3.7,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-2",
                id: "0-2-1",
                sortOrder: "1"
              },
              {
                name: "Hawaiian Pizza Slice",
                description: null,
                sizeOptions: [
                  {
                    name: "Slice",
                    price: 3.7,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-2",
                id: "0-2-2",
                sortOrder: "2"
              },
              {
                name: "Margherita Pizza Slice",
                description: null,
                sizeOptions: [
                  {
                    name: "Slice",
                    price: 3.7,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-2",
                id: "0-2-3",
                sortOrder: "3"
              },
              {
                name: "Meat Lover's Pizza Slice",
                description: null,
                sizeOptions: [
                  {
                    name: "Slice",
                    price: 4.6,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-2",
                id: "0-2-4",
                sortOrder: "4"
              },
              {
                name: "Monster Pizza Slice",
                description:
                  "Sausage, pepperoni, mushrooms, green peppers, onions, cheese.",
                sizeOptions: [
                  {
                    name: "Slice",
                    price: 4.6,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-2",
                id: "0-2-5",
                sortOrder: "5"
              },
              {
                name: "Pesto Pizza Slice",
                description: null,
                sizeOptions: [
                  {
                    name: "Slice",
                    price: 3.1,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-2",
                id: "0-2-6",
                sortOrder: "6"
              },
              {
                name: "Pesto & Tomato Pizza Slice",
                description: null,
                sizeOptions: [
                  {
                    name: "Slice",
                    price: 3.7,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-2",
                id: "0-2-7",
                sortOrder: "7"
              },
              {
                name: "Spinach Pizza Slice",
                description: null,
                sizeOptions: [
                  {
                    name: "Slice",
                    price: 3.7,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-2",
                id: "0-2-8",
                sortOrder: "8"
              },
              {
                name: "Veggie Pizza Slice",
                description: null,
                sizeOptions: [
                  {
                    name: "Slice",
                    price: 4.6,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-2",
                id: "0-2-9",
                sortOrder: "9"
              },
              {
                name: "White Pizza Slice",
                description: null,
                sizeOptions: [
                  {
                    name: "Slice",
                    price: 3.1,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-2",
                id: "0-2-10",
                sortOrder: "10"
              }
            ],
            id: "0-2",
            sortOrder: "2",
            menuOptionIds: ["1"]
          },
          {
            name: "Specials",
            mis: [
              {
                name: "2 Slice Cheese Pizzas & Soda Special",
                description: null,
                sizeOptions: [
                  {
                    name: "Special",
                    price: 7.25,
                    selected: true
                  }
                ],
                menuOptionIds: ["2", "3", "4"],
                category: "0-3",
                id: "0-3-0",
                sortOrder: "0"
              },
              {
                name: "Slice of Cheese Pizza, 6 Wings & Soda Special",
                description: null,
                sizeOptions: [
                  {
                    name: "Special",
                    price: 8.75,
                    selected: true
                  }
                ],
                menuOptionIds: ["2", "1", "5"],
                category: "0-3",
                id: "0-3-1",
                sortOrder: "1"
              },
              {
                name: "Slice of Cheese Pizza, Small Salad & Soda Special",
                description: null,
                sizeOptions: [
                  {
                    name: "Special",
                    price: 7.95,
                    selected: true
                  }
                ],
                menuOptionIds: ["2", "1", "6"],
                category: "0-3",
                id: "0-3-2",
                sortOrder: "2"
              },
              {
                name: "Family Special",
                description: "2 large cheese pizzas, 25 wings & 2-liter soda.",
                sizeOptions: [
                  {
                    name: "Special",
                    price: 42.5,
                    selected: true
                  }
                ],
                menuOptionIds: ["7", "8", "5", "2"],
                category: "0-3",
                id: "0-3-3",
                sortOrder: "3"
              },
              {
                name: "Gluten Free Pizza Special",
                description: null,
                sizeOptions: [
                  {
                    name: "10''",
                    price: 7.25,
                    selected: true
                  },
                  {
                    name: "14''",
                    price: 13.45
                  }
                ],
                menuOptionIds: ["9", "10"],
                category: "0-3",
                id: "0-3-4",
                sortOrder: "4"
              },
              {
                name: "Large Cheese Pizza & 25 Wings Special",
                description: "Wings served with ranch dressing.",
                sizeOptions: [
                  {
                    name: "Special",
                    price: 25.95,
                    selected: true
                  }
                ],
                menuOptionIds: ["11", "5"],
                category: "0-3",
                id: "0-3-5",
                sortOrder: "5"
              },
              {
                name: "Sicilian Thick Crust Cheese Pizza & 25 Wings",
                description: null,
                sizeOptions: [
                  {
                    name: "Special",
                    price: 29.5,
                    selected: true
                  }
                ],
                menuOptionIds: ["11", "5"],
                category: "0-3",
                id: "0-3-6",
                sortOrder: "6"
              }
            ],
            id: "0-3",
            sortOrder: "3",
            menuOptionIds: []
          },
          {
            name: "Salads",
            mis: [
              {
                name: "Antipasto Salad",
                description: null,
                sizeOptions: [
                  {
                    name: "Small",
                    price: 5.25,
                    selected: true
                  },
                  {
                    name: "Large",
                    price: 7.95
                  }
                ],
                menuOptionIds: [],
                category: "0-4",
                id: "0-4-0",
                sortOrder: "0"
              },
              {
                name: "Dinner Salad",
                description: null,
                sizeOptions: [
                  {
                    name: "Small",
                    price: 4.25,
                    selected: true
                  },
                  {
                    name: "Large",
                    price: 6.25
                  }
                ],
                menuOptionIds: [],
                category: "0-4",
                id: "0-4-1",
                sortOrder: "1"
              },
              {
                name: "Chicken Salad",
                description: null,
                sizeOptions: [
                  {
                    name: "Small",
                    price: 5.25,
                    selected: true
                  },
                  {
                    name: "Large",
                    price: 7.95
                  }
                ],
                menuOptionIds: [],
                category: "0-4",
                id: "0-4-2",
                sortOrder: "2"
              }
            ],
            id: "0-4",
            sortOrder: "4",
            menuOptionIds: ["12", "13"]
          },
          {
            name: "Wings",
            mis: [
              {
                name: "Chicken Wings",
                description: "Includes 2 ranch sauces.",
                sizeOptions: [
                  {
                    name: "12 Pieces",
                    price: 9.75,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-5",
                id: "0-5-0",
                sortOrder: "0"
              },
              {
                name: "Chicken Wings",
                description: "Includes 3 ranch sauces.",
                sizeOptions: [
                  {
                    name: "25 Pieces",
                    price: 16.5,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-5",
                id: "0-5-1",
                sortOrder: "1"
              },
              {
                name: "Chicken Wings",
                description: "Includes 6 ranch sauces.",
                sizeOptions: [
                  {
                    name: "50 Pieces",
                    price: 29.25,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-5",
                id: "0-5-2",
                sortOrder: "2"
              }
            ],
            id: "0-5",
            sortOrder: "5",
            menuOptionIds: ["14", "15"]
          },
          {
            name: "Calzones & Strombolis",
            mis: [
              {
                name: "Chicken Calzone",
                description: "Comes with sauce.",
                sizeOptions: [
                  {
                    name: "Calzone",
                    price: 9.75,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-6",
                id: "0-6-0",
                sortOrder: "0"
              },
              {
                name: "Meat Lover's Calzone",
                description: "Comes with sauce.",
                sizeOptions: [
                  {
                    name: "Calzone",
                    price: 9.75,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-6",
                id: "0-6-1",
                sortOrder: "1"
              },
              {
                name: "Ricotta & Mozzarella Calzone",
                description: "Comes with sauce.",
                sizeOptions: [
                  {
                    name: "Calzone",
                    price: 7.25,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-6",
                id: "0-6-2",
                sortOrder: "2"
              },
              {
                name: "Sausage Calzone",
                description: "Comes with sauce.",
                sizeOptions: [
                  {
                    name: "Calzone",
                    price: 8.25,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-6",
                id: "0-6-3",
                sortOrder: "3"
              },
              {
                name: "Meatball Calzone",
                description: "Comes with sauce.",
                sizeOptions: [
                  {
                    name: "Calzone",
                    price: 8.25,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-6",
                id: "0-6-4",
                sortOrder: "4"
              },
              {
                name: "Ham Calzone",
                description: "Comes with sauce.",
                sizeOptions: [
                  {
                    name: "Calzone",
                    price: 8.25,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-6",
                id: "0-6-5",
                sortOrder: "5"
              },
              {
                name: "Special Calzone",
                description:
                  "Comes with sauce, sausage, meatballs, mushrooms, pepperoni, peppers.",
                sizeOptions: [
                  {
                    name: "Calzone",
                    price: 9.75,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-6",
                id: "0-6-6",
                sortOrder: "6"
              },
              {
                name: "Vegetable Calzone",
                description:
                  "Comes with sauce, mushrooms, green peppers, onions, black olives, and cheese.",
                sizeOptions: [
                  {
                    name: "Calzone",
                    price: 7.5,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-6",
                id: "0-6-7",
                sortOrder: "7"
              },
              {
                name: "Pepperoni & Cheese Stromboli",
                description:
                  "Stromboli epiroll with side of sauce & pepperoni & cheese roll.",
                sizeOptions: [
                  {
                    name: "Stromboli",
                    price: 6.25,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-6",
                id: "0-6-8",
                sortOrder: "8"
              },
              {
                name: "Sausage & Cheese Stromboli",
                description:
                  "Stromboli epiroll with side of sauce & sausage & cheese roll.",
                sizeOptions: [
                  {
                    name: "Stromboli",
                    price: 6.25,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-6",
                id: "0-6-9",
                sortOrder: "9"
              }
            ],
            id: "0-6",
            sortOrder: "6",
            menuOptionIds: ["16"]
          },
          {
            name: "Hoagies",
            mis: [
              {
                name: "Ham & Cheese Hoagie",
                description: null,
                sizeOptions: [
                  {
                    name: "Hoagie",
                    price: 6,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-7",
                id: "0-7-0",
                sortOrder: "0"
              },
              {
                name: "Salami & Cheese Hoagie",
                description: null,
                sizeOptions: [
                  {
                    name: "Hoagie",
                    price: 6,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-7",
                id: "0-7-1",
                sortOrder: "1"
              },
              {
                name: "Veggie & Cheese Hoagie",
                description: null,
                sizeOptions: [
                  {
                    name: "Hoagie",
                    price: 6,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-7",
                id: "0-7-2",
                sortOrder: "2"
              },
              {
                name: "Submarine Special Hoagie",
                description: "Ham, salami, capicola, and cheese.",
                sizeOptions: [
                  {
                    name: "Hoagie",
                    price: 7.5,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-7",
                id: "0-7-3",
                sortOrder: "3"
              },
              {
                name: "Roast Beef & Cheese Hoagie",
                description: null,
                sizeOptions: [
                  {
                    name: "Hoagie",
                    price: 6.5,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-7",
                id: "0-7-4",
                sortOrder: "4"
              },
              {
                name: "Turkey & Cheese Hoagie",
                description: null,
                sizeOptions: [
                  {
                    name: "Hoagie",
                    price: 6.5,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-7",
                id: "0-7-5",
                sortOrder: "5"
              }
            ],
            id: "0-7",
            sortOrder: "7",
            menuOptionIds: ["17", "18"]
          },
          {
            name: "New York Style Hoagies",
            mis: [
              {
                name: "Chicken Cutlet Parmesan Hot Hoagie",
                description: null,
                sizeOptions: [
                  {
                    name: "Hoagie",
                    price: 7.95,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-8",
                id: "0-8-0",
                sortOrder: "0"
              },
              {
                name: "Eggplant Parmesan Hot Hoagie",
                description: null,
                sizeOptions: [
                  {
                    name: "Hoagie",
                    price: 7,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-8",
                id: "0-8-1",
                sortOrder: "1"
              },
              {
                name: "Meatball Hot Hoagie",
                description: null,
                sizeOptions: [
                  {
                    name: "Hoagie",
                    price: 6.25,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-8",
                id: "0-8-2",
                sortOrder: "2"
              },
              {
                name: "Meatball & Cheese Hot Hoagie",
                description: null,
                sizeOptions: [
                  {
                    name: "Hoagie",
                    price: 7,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-8",
                id: "0-8-3",
                sortOrder: "3"
              },
              {
                name: "Sausage Hot Hoagie",
                description: null,
                sizeOptions: [
                  {
                    name: "Hoagie",
                    price: 6.25,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-8",
                id: "0-8-4",
                sortOrder: "4"
              },
              {
                name: "Sausage & Cheese Hot Hoagie",
                description: null,
                sizeOptions: [
                  {
                    name: "Hoagie",
                    price: 7,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-8",
                id: "0-8-5",
                sortOrder: "5"
              },
              {
                name: "Steak & Cheese Hot Hoagie",
                description: "With sauce.",
                sizeOptions: [
                  {
                    name: "Hoagie",
                    price: 6.75,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-8",
                id: "0-8-6",
                sortOrder: "6"
              },
              {
                name: "Steak & Mushroom Hot Hoagie",
                description: "Cheese & sauce.",
                sizeOptions: [
                  {
                    name: "Hoagie",
                    price: 7.5,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-8",
                id: "0-8-7",
                sortOrder: "7"
              },
              {
                name: "Steak Special Hot Hoagie",
                description:
                  "Onions, mushrooms, green peppers, cheese, and sauce.",
                sizeOptions: [
                  {
                    name: "Hoagie",
                    price: 8.25,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-8",
                id: "0-8-8",
                sortOrder: "8"
              }
            ],
            id: "0-8",
            sortOrder: "8",
            menuOptionIds: ["19"]
          },
          {
            name: "Pasta Dishes",
            mis: [
              {
                name: "Baked Ziti",
                description: "With ricotta & mozzarella cheeses, tomato sauce.",
                sizeOptions: [
                  {
                    name: "Pasta",
                    price: 9.25,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-9",
                id: "0-9-0",
                sortOrder: "0"
              },
              {
                name: "Cheese Ravioli",
                description: null,
                sizeOptions: [
                  {
                    name: "Pasta",
                    price: 9.25,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-9",
                id: "0-9-1",
                sortOrder: "1"
              },
              {
                name: "Chicken Cutlet Parmesan",
                description: "Served with spaghetti.",
                sizeOptions: [
                  {
                    name: "Pasta",
                    price: 11.25,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-9",
                id: "0-9-2",
                sortOrder: "2"
              },
              {
                name: "Eggplant Parmesan",
                description: "Side of spaghetti.",
                sizeOptions: [
                  {
                    name: "Plate",
                    price: 9.25,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-9",
                id: "0-9-3",
                sortOrder: "3"
              },
              {
                name: "Lasagna",
                description: null,
                sizeOptions: [
                  {
                    name: "Pasta",
                    price: 9.25,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-9",
                id: "0-9-4",
                sortOrder: "4"
              },
              {
                name: "Manicotti",
                description: null,
                sizeOptions: [
                  {
                    name: "Pasta",
                    price: 9.25,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-9",
                id: "0-9-5",
                sortOrder: "5"
              },
              {
                name: "Spaghetti",
                description: null,
                sizeOptions: [
                  {
                    name: "Pasta",
                    price: 7.75,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-9",
                id: "0-9-6",
                sortOrder: "6"
              },
              {
                name: "Spaghetti with Sausage",
                description: null,
                sizeOptions: [
                  {
                    name: "Pasta",
                    price: 9.25,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-9",
                id: "0-9-7",
                sortOrder: "7"
              },
              {
                name: "Spaghetti with Meatballs",
                description: null,
                sizeOptions: [
                  {
                    name: "Pasta",
                    price: 9.25,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-9",
                id: "0-9-8",
                sortOrder: "8"
              }
            ],
            id: "0-9",
            sortOrder: "9",
            menuOptionIds: ["20"]
          },
          {
            name: "Desserts",
            mis: [
              {
                name: "Cannoli",
                description: null,
                sizeOptions: [
                  {
                    name: "Dessert",
                    price: 3.5,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-10",
                id: "0-10-0",
                sortOrder: "0"
              },
              {
                name: "NY Cheesecake",
                description: null,
                sizeOptions: [
                  {
                    name: "Dessert",
                    price: 3.5,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-10",
                id: "0-10-1",
                sortOrder: "1"
              },
              {
                name: "Italian Ice",
                description: "Select your flavor when you pick-up your order.",
                sizeOptions: [
                  {
                    name: "Dessert",
                    price: 2.5,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-10",
                id: "0-10-2",
                sortOrder: "2"
              },
              {
                name: "Gelato",
                description: "Select your flavor when you pick-up your order.",
                sizeOptions: [
                  {
                    name: "Dessert",
                    price: 2.5,
                    selected: true
                  }
                ],
                menuOptionIds: [],
                category: "0-10",
                id: "0-10-3",
                sortOrder: "3"
              }
            ],
            id: "0-10",
            sortOrder: "10",
            menuOptionIds: []
          },
          {
            name: "Beverages",
            mis: [
              {
                name: "Soda",
                description: null,
                sizeOptions: [
                  {
                    name: "2 Liter",
                    price: 3.75,
                    selected: true
                  }
                ],
                menuOptionIds: ["2"],
                category: "0-11",
                id: "0-11-0",
                sortOrder: "0"
              }
            ],
            id: "0-11",
            sortOrder: "11"
          }
        ],
        id: "0"
      }
    ]
  };

  debounce(event) {
    console.log(event);
  }
}

