// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  // production: false,
  // env: "dev",
  // adminApiUrl: 'https://swozix2epl.execute-api.us-east-2.amazonaws.com/dev/',
  // qmenuApiUrl: 'https://67dqylz39g.execute-api.us-east-2.amazonaws.com/dev/',
  // legacyApiUrl: "https://quez.herokuapp.com/",
  // autoGmbUrl: "http://localhost:3000/",
  
  // bizUrl: 'https://restaurant-quez.herokuapp.com/',
  // customerUrl: 'https://customer-app.herokuapp.com/',
  // thumnailUrl: 'https://s3.amazonaws.com/chopstresized/128_menuImage/',
  // normalResUrl: 'https://s3.amazonaws.com/chopstresized/768_menuImage/',
  // stripePublishableKey: 'pk_test_PbXsKYfVeKPV4wlQP4wpQYfg'

  production: true,
  env: "prod",
  adminApiUrl: "https://swozix2epl.execute-api.us-east-2.amazonaws.com/prod/",
  qmenuApiUrl: "https://67dqylz39g.execute-api.us-east-2.amazonaws.com/prod/",
  legacyApiUrl: "https://api.myqmenu.com/",
  autoGmbUrl: "http://localhost:3000/",
  bizUrl: 'https://biz.qmenu.us/',
  customerUrl: 'https://qmenu.us/',
  thumnailUrl: 'https://s3.amazonaws.com/chopstresized/128_menuImage/',
  normalResUrl: 'https://s3.amazonaws.com/chopstresized/768_menuImage/',
  stripePublishableKey: 'pk_live_uSs2MVVyG0vn6TICsTIyXG6Y'
};

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
