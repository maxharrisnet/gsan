Help me complete an app I am working on.

I am working on an app for a client. It is built in Node.js and the Remix framework (using the latest Shopify Remix app template). The purpose off the app is to provide a dashboard so that my client's (GSAN) customers can log in with their Shopify or Sonar credentials and view the status of the satellite internet services that they subscribe to through GSAN (also branded as Switch). The GSAN brand customers need to log in through the Shopify API with their customer credentials and the Switch customers need to log in via the Sonar.

Service providers should be able to log in using the same credentials. Service provider accounts will be identified with a boolean metafield called "is_service_provider". I want to associate customers with their provider with a "provider" metafield.

Once customers log in, the app should pull their previous order data to determine what services that have access to. Service provider data should be pulled as well. This should be saved in the session data.

- There should be a dashboard page where users can view relevant account information and data at a glance. This should also have a list of modems/satellites with their latency data in a simple bar graph (I have built this part already in performance.jsx. We should probably merge that with what I have in dashboard.jsx). I am unsure about what should be on the rest of the page and how to populate it.
- a modempage that shows the details of a particular modem's performance in a series of graphs. Access this page by the modem's id in the url or by clicking on the modem listed on the Dashboard page.
- I have started building the reports page in which reports for past satellite data can be generated and downloaded
- A map page where the satellites associated with an account or service provider can be displayed on a map (like Google Maps). I don't have anything for this yet.
- a page for service providers to view a list of their customers and their account status. This should link to a page similar to the dashboard that displays relevant account data for that user.

These are my thoughts on the app so far. Please feel free to question my approach at any point or to ask for any clarification you might need. Provide any suggestions you may have about technical approach or the actual app features.

Generate code based on the files that I upload and any new files needed. Let me know if there are other files you need to see. Point out any errors or potential pitfalls you see in my code. Make sure you check the latest documentation for Shopify, as it changes often.

I have spent a lot of time dealing with the log in and I now want to tie together the other pieces of the app and complete it. Let's worth through on part at a time, starting with the dashboard page where users should be directed once they are logged in. The files for that are attached here. Once we get that part working, prompt me for another section until we get this app complete.

Start by reviewing the code (see file structore below). Then let me know if you understand. Give me a brief plan for what we are going to do. When I say "sounds good", you can proceed to the next step.

# Resources

GSAN Shopify Store: https://gsan.co/
Compass API: https://api-compass.speedcast.com/api-docs/
Sonar Documentation: https://legacy.sonar.software/apidoc/ (use these legacy docs, not the latest. This is for the API that we have access to)
Sonar URL: https://switch.sonar.software/
Shopify API Documentation: https://shopify.dev/docs/api/usage

# File Structure

C:\Dev\GSAN\gsan
├── app
| ├── compass.server.js
| ├── components
| | ├── charts
| | ├── dashboard
| | ├── ErrorBoundary.jsx
| | ├── layout
| | ├── loader
| | └── LoadingSpinner.jsx
| ├── context
| | └── UserContext.jsx
| ├── db.server.js
| ├── entry.server.jsx
| ├── gsan.server.js
| ├── root.jsx
| ├── routes
| | ├── api.gps.jsx
| | ├── api.modem.jsx
| | ├── api.services.jsx
| | ├── auth.$.jsx
|  |  ├── auth.jsx
|  |  ├── auth.login
|  |  ├── customers.jsx
|  |  ├── dashboard.jsx
|  |  ├── logout.js
|  |  ├── modem.$provider.$modemId.jsx
|  |  ├── performance.jsx
|  |  ├── reports.$provider.usage.jsx
| | ├── switch.login.jsx
| | ├── webhooks.app.uninstalled.jsx
| | └── \_index
| ├── routes.js
| ├── shopify.server.js
| ├── sonar.server.js
| ├── styles
| | ├── charts.css
| | ├── dashboard.css
| | ├── global.css
| | ├── modem.css
| | └── reports.css
| └── utils
| ├── auth.server.js
| ├── provider.server.js
| ├── session.server.js
| └── user.server.js
├── build
| ├── client
| | ├── assets
| | └── favicon.ico
| └── server
| ├── assets
| └── index.js
├── CHANGELOG.md
├── Dockerfile
├── env.d.ts
├── extensions
├── instructions.md
├── package-lock.json
├── package.json
├── prisma
| ├── dev.sqlite
| ├── migrations
| | └── 20240530213853_create_session_table
| └── schema.prisma
├── public
| ├── assets
| | └── images
| └── favicon.ico
├── README.md
├── remix.config.js
├── shopify.app.toml
├── shopify.web.toml
├── tsconfig.json
└── vite.config.js
