Sample Authentication and Authorization Server
==================

This is a sample authentication and authorization server using node and express.

# Installation
In this guide has been used _Yarn_ as package manager, but if you want you can use _NPM_ instead.

Install dependencies
```
yarn
```

# Configuration
To configure this project has been used [node-config](https://www.npmjs.com/package/config) package, there is a _config_ directory to handle the environments; if you need your own configuration please create a _local.json_ file with yours parameters within.
```
vi /config/local.json
```

The environment is set according NODE_ENV variable.
```
export NODE_ENV=production
```

# Development
If you need to seed the database use
```
yarn seed
```
Watch out!! The script will drop all your data!

To run the server in debug mode please use the related script.
```
yarn dev
```

In this way the script is listening to the code and restart itself automatically. Furthermore on port 9229 you can attach a debug console.

# Deploy
```
yarn start
```
