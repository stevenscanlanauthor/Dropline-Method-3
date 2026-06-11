const { execSync } = require('child_process');
const { notarize } = require('@electron/notarize');

function isAdhocSigned(appPath) {
  try {
    const out = execSync(`codesign -dv --verbose=4 "${appPath}" 2>&1`, { encoding: 'utf8' });
    return out.includes('Signature=adhoc') || out.includes('TeamIdentifier=not set');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.includes('Signature=adhoc') || msg.includes('TeamIdentifier=not set');
  }
}

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') return;

  if (process.env.NOTARIZE !== 'true') {
    console.log('Skipping notarization (unsigned build). Set NOTARIZE=true with Apple certs for release.');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.warn('Skipping notarization — set APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID.');
    return;
  }

  if (isAdhocSigned(appPath)) {
    console.warn('Skipping notarization — app is adhoc-signed.');
    return;
  }

  console.log(`Notarizing ${appPath}…`);
  await notarize({ appPath, appleId, appleIdPassword, teamId });
  console.log('Notarization complete.');
};
