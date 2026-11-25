const fs = require('fs');
const path = require('path');

// app.json holds the static config; this file only adds google-services.json (FCM push) when it has been placed in the project root.
module.exports = ({ config }) => {
  const hasGoogleServices = fs.existsSync(path.join(__dirname, 'google-services.json'));
  return {
    ...config,
    android: {
      ...config.android,
      ...(hasGoogleServices ? { googleServicesFile: './google-services.json' } : {}),
    },
  };
};
