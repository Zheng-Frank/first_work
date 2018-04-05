// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  env: "dev",
  adminApiUrl: 'https://swozix2epl.execute-api.us-east-2.amazonaws.com/dev/',
  qmenuApiUrl: 'https://67dqylz39g.execute-api.us-east-2.amazonaws.com/dev/',
  // adminApiUrl: "https://swozix2epl.execute-api.us-east-2.amazonaws.com/prod/",
  // qmenuApiUrl: "https://67dqylz39g.execute-api.us-east-2.amazonaws.com/prod/"
  bizUrl: 'https://restaurant-quez.herokuapp.com/',
  customerUrl: 'https://customer-app.herokuapp.com/'
};
